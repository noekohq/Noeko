import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../database/db";
import { IIdea, IIdeaAsRelation } from "../database/models/ideas";
import { IUserFile } from "../database/models/userfile";
import { Embeddings } from "../semantics/embeddings";
import { getLM, PromptBuilder } from "../semantics/lm";
import { htmlToMarkdown } from "../utils/formatting";
import { SchemaType } from "@google/generative-ai";
import { max_lm_prompt_size } from "../settings";
import { getFormattedDateTimeToday } from "../utils/prompts/components";
import { ITag } from "../database/models/tag";

export type ISearchResultValue =
  | (IIdea & {
      type: "idea";
    })
  | (IUserFile & {
      type: "file";
    });

export type ISearchResult = {
  id: string | RecordId;
  score: number;
  value: ISearchResultValue;
  highlightText?: string;
  debug?: {
    semanticScore?: number;
    ftsContentScore?: number;
    ftsTitleScore?: number;
    exactTitleBonus?: number;
    source: "semantic" | "fts" | "hybrid";
  };
};

export type IFTSIdeaResult = IIdea & {
  contentScore: number;
  titleScore: number;
  preview: string;
};

export type ISemanticIdeaResult = IIdeaAsRelation & {};

export type ISearchOverview = {
  findings: {
    excerpt: string;
    sourceId: string;
    analysis: string;
  }[];
  overview: string;
};

export type ITagSearchResultValue = ITag;

export type ITagSearchResult = {
  id: string | RecordId;
  value: ITagSearchResultValue;
  score: number;
  searchType: "fts" | "semantic" | "comprehensive";
};

export class Search {
  private static readonly COMPREHENSIVE_WEIGHTS = {
    SEMANTIC: 1.5,
    FTS_TITLE: 1.0,
    FTS_CONTENT: 0.5,
  };
  private static readonly EXACT_TITLE_BONUS = 2.0;
  private static readonly SEMANTIC_THRESHOLD = 0.45;

  constructor() {}

  /**
   * Defines SurrealDB Analyzers, Indexes, and Functions for search.
   * Uses the exact definitions provided in the initial prompt.
   */
  static async up() {
    const defineVectorIndex = () => {
      return `
      DEFINE INDEX OVERWRITE idx_idea_embeddings
        ON TABLE idea
        FIELDS embeddings
        HNSW DIMENSION 768
        DIST COSINE
        TYPE F32;
      `;
    };

    const defineTagVectorIndex = () => {
      return `
      DEFINE INDEX OVERWRITE idx_tag_embeddings
        ON TABLE tag
        FIELDS embeddings
        HNSW DIMENSION 768
        DIST COSINE
        TYPE F32;
      `;
    };

    const ideaSearchAnalyzer = () => {
      return `
      DEFINE ANALYZER OVERWRITE idea_analyzer
      TOKENIZERS class
      FILTERS lowercase;`;
    };

    const tagSearchAnalyzer = () => {
      return `
      DEFINE ANALYZER OVERWRITE tag_analyzer
      TOKENIZERS class
      FILTERS lowercase;`;
    };

    const ftsTitleSearchIndex = () => {
      return `
      DEFINE INDEX OVERWRITE idx_idea_title_fts
        ON TABLE idea
        FIELDS title
        SEARCH ANALYZER idea_analyzer
        BM25 HIGHLIGHTS;
      `;
    };

    const ftsContentSearchIndex = () => {
      return `
      REMOVE INDEX IF EXISTS idx_idea_content_fts ON TABLE idea;

      DEFINE INDEX OVERWRITE idx_idea_content_fts
        ON TABLE idea
        FIELDS contentPlain
        SEARCH ANALYZER idea_analyzer
        BM25 HIGHLIGHTS;
      `;
    };

    const ftsTagNameSearchIndex = () => {
      return `
      DEFINE INDEX OVERWRITE idx_tag_name_fts
        ON TABLE tag
        FIELDS name
        SEARCH ANALYZER tag_analyzer
        BM25 HIGHLIGHTS;
      `;
    };

    const ftsTagDescriptionSearchIndex = () => {
      return `
      DEFINE INDEX OVERWRITE idx_tag_description_fts
        ON TABLE tag
        FIELDS description
        SEARCH ANALYZER tag_analyzer
        BM25 HIGHLIGHTS;
      `;
    };

    // Uses the exact function definition from the initial prompt
    const ftsSearchFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::search_user_ideas_fts(
        $userId: string,
        $query: string
      ) {
        LET $ideas = SELECT
            *,
            contentPlain,
            title,
            search::highlight("->", "<-", 0) AS preview, -- Uses -> <- markers
            search::score(0) AS contentScore,
            search::score(1) AS titleScore
        FROM idea
        WHERE
            (contentPlain @0@ $query OR
            title @1@ $query)
            AND <-owns<-(user WHERE id = <record> $userId);

        return $ideas;
      }`;
    };

    const ftsSearchTagsFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::search_user_tags_fts(
        $userId: record<user>,
        $query: string,
        $limit: int
      ) {
        LET $tags = SELECT
            *,
            name,
            description,
            search::highlight("->", "<-", 0) AS preview, -- Uses -> <- markers
            search::score(0) AS nameScore,
            search::score(1) AS descriptionScore
        FROM tag
        WHERE
            (name @0@ $query OR
            description @1@ $query)
            AND <-owns<-(user WHERE id = <record> $userId)
        LIMIT $limit;

        return $tags;
      }`;
    };

    // Uses the exact function definition from the initial prompt
    const searchSimilarToIdea = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::search_similar_to_idea(
        $ideaId: string,
        $userId: string,
        $limit: option<int>,
        $threshold: option<float>
      ) {
        LET $embeddings = SELECT VALUE embeddings FROM ONLY <record> $ideaId;

        IF !$embeddings THEN RETURN [] END;

        LET $got_limit = IF !!$limit THEN $limit ELSE 100 END;
        LET $got_threshold = IF !!$threshold THEN $threshold ELSE 0.4 END;

        LET $results =
            SELECT
                *,
                vector::similarity::cosine(embeddings, $embeddings) AS distance,
                ->is_source_for->(?).* as derivedList -- Includes derivedList
            FROM idea
            WHERE
              <-owns<-(user WHERE id = <record> $userId)
              AND !!content
              AND !!embeddings
              AND vector::similarity::cosine(embeddings, $embeddings) >= $got_threshold
            ORDER BY distance DESC
            LIMIT <int> $got_limit;

        RETURN $results;
      }
          `;
    };

    // Uses the exact function definition from the initial prompt
    const searchSimilarToEmbeddings = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::search_similar_to_embeddings(
        $provided_embeddings: array<float>,
        $userId: string,
        $limit: option<int>,
        $threshold: option<float>
      ) {
        IF !$provided_embeddings THEN return [] END;
        LET $got_limit = IF !!$limit THEN $limit ELSE 100 END;
        LET $got_threshold = IF !!$threshold THEN $threshold ELSE 0.4 END;

        LET $results =
            SELECT
                *,
                vector::similarity::cosine(embeddings, $provided_embeddings) AS distance,
                ->is_source_for->(?).* as derivedList -- Includes derivedList
            OMIT embeddings
            FROM idea
            WHERE
              <-owns<-(user WHERE id = <record> $userId)
              AND !!content
              AND !!embeddings
              AND vector::similarity::cosine(embeddings, $provided_embeddings) >= $got_threshold
            ORDER BY distance DESC
            LIMIT $got_limit;

        RETURN $results;
      }
          `;
    };

    const searchSimilarTagsToEmbeddings = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::search_similar_tags_to_embeddings(
        $provided_embeddings: array<float>,
        $userId: record,
        $limit: option<int>,
        $threshold: option<float>
      ) {
        IF !$provided_embeddings THEN return [] END;
        LET $got_limit = IF !!$limit THEN $limit ELSE count(fn::get_user_tags($userId)) END;
        LET $got_threshold = IF !!$threshold THEN $threshold ELSE 0.4 END;

        LET $results =
            SELECT
                *,
                vector::similarity::cosine(embeddings, $provided_embeddings) AS distance
            FROM tag
            WHERE
              <-owns<-(user WHERE id = <record> $userId)
              AND !!embeddings
              AND vector::similarity::cosine(embeddings, $provided_embeddings) >= $got_threshold
            ORDER BY distance DESC
            LIMIT $got_limit;

        RETURN $results;
      }
          `;
    };

    const searchSimilarIdeasToTag = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::search_ideas_similar_to_tag(
        $tagId: record<tag>,
        $userId: record<user>,
        $limit: option<int>,
        $threshold: option<float>
      ) {
        -- Description: Finds ideas semantically similar to a given tag's embeddings for a specific user.
        -- Parameters:
        --   $tagId: The record ID of the tag.
        --   $userId: The record ID of the user.
        --   $limit: Max number of similar ideas (default: 10).
        --   $threshold: Min similarity threshold (default: ${Search.SEMANTIC_THRESHOLD}).

        LET $tag_embeddings = SELECT VALUE embeddings FROM ONLY $tagId;

        IF !$tag_embeddings THEN
          RETURN []; -- No embeddings for the tag, return empty
        END;

        LET $default_limit = 10;
        LET $default_threshold = ${Search.SEMANTIC_THRESHOLD};

        LET $actual_limit = IF $limit != NONE THEN $limit ELSE $default_limit END;
        LET $actual_threshold = IF $threshold != NONE THEN $threshold ELSE $default_threshold END;

        LET $results = (
            SELECT
                *, -- Select all fields from the idea
                vector::similarity::cosine(embeddings, $tag_embeddings) AS distance,
                ->is_source_for->(? WHERE <-owns<-(user WHERE id = $userId)).* as derivedList -- Get derived ideas owned by the user
            OMIT embeddings -- Don't return the idea's own embeddings in the result
            FROM idea
            WHERE
                <-owns<-(user WHERE id = $userId) -- Idea must be owned by the specified user
                AND !!content     -- Idea must have content
                AND !!embeddings  -- Idea must have embeddings
                AND vector::similarity::cosine(embeddings, $tag_embeddings) >= $actual_threshold
            ORDER BY distance DESC
            LIMIT $actual_limit
        );

        RETURN $results;
      }
      `;
    };

    try {
      const db = await getDatabase();
      if (!db) throw new Error("Database not initialized for Search.up");
      console.info(
        "Defining search analyzers, indexes, and functions (using original definitions)...",
      );
      await db.query(ideaSearchAnalyzer());
      await db.query(tagSearchAnalyzer());
      await db.query(ftsTitleSearchIndex());
      await db.query(ftsContentSearchIndex());
      await db.query(ftsTagNameSearchIndex());
      await db.query(ftsTagDescriptionSearchIndex());
      await db.query(defineVectorIndex());
      await db.query(defineTagVectorIndex());
      await db.query(ftsSearchFunction());
      await db.query(ftsSearchTagsFunction());
      await db.query(searchSimilarToIdea());
      await db.query(searchSimilarToEmbeddings());
      await db.query(searchSimilarTagsToEmbeddings());
      await db.query(searchSimilarIdeasToTag());
    } catch (error) {
      console.error("Error during Search.up():", error);
      throw error;
    }
  }

  /**
   * Optional: Removes search indexes and functions.
   */
  static async down() {
    console.warn(
      "Search.down() needs specific REMOVE statements based on defined resources.",
    );
  }

  /**
   * Performs Full-Text Search (FTS) using the original `fn::search_user_ideas_fts`.
   * Returns results mapped to the standardized ISearchResult format.
   */
  static async ftsSearch(
    userId: string,
    query: string,
  ): Promise<ISearchResult[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Database not initialized");

      // Call the original function by name
      // It expects userId as a string like "user:id"
      const results = await db.run<IFTSIdeaResult[]>(
        "fn::search_user_ideas_fts",
        [
          userId, // Pass the user ID string directly as the function expects
          query,
        ],
      );

      if (!results) return [];

      // Map raw FTS results to the standard ISearchResult format
      return results.map((idea): ISearchResult => {
        // Simple FTS score combination (can be refined)
        const combinedFtsScore =
          (idea.titleScore ?? 0) + (idea.contentScore ?? 0);
        return {
          id: idea.id,
          score: combinedFtsScore,
          value: {
            ...idea,
            type: "idea",
          }, // The full object as returned by the function
          highlightText: idea.preview, // Use the 'preview' field with -> <- markers
          debug: {
            ftsContentScore: idea.contentScore,
            ftsTitleScore: idea.titleScore,
            source: "fts",
          },
        };
      });
    } catch (error) {
      console.error("Error during FTS search:", error);
      return undefined;
    }
  }

  /**
   * Performs Semantic (Vector) Search using the original `fn::search_similar_to_embeddings`.
   * Returns results mapped to the standardized ISearchResult format.
   */
  static async semanticSearch(
    userId: string,
    embedding: number[],
    limit: number = 10,
  ): Promise<ISearchResult[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Database not initialized");

      // Call the original function by name
      // It expects userId as a string like "user:id"
      const results = await db.run<ISemanticIdeaResult[]>( // Type includes distance and derivedList
        "fn::search_similar_to_embeddings",
        [embedding, userId, limit], // Pass userId string directly
      );

      if (!results) return [];

      // Map semantic results to the standard ISearchResult format
      return results.map((idea): ISearchResult => {
        // Generate a simple preview if FTS isn't involved
        // Use contentPlain if available, otherwise title
        const preview = idea.contentPlain
          ? idea.contentPlain.substring(0, 150) +
            (idea.contentPlain.length > 150 ? "..." : "")
          : (idea.title ?? "No Content");

        // **Important**: Decide how to handle `derivedList` from the function results.
        // Option 1: Include it in the `value` object (as it is now).
        // Option 2: Process it into the `IIdeaDerivedMap` and add to `value`.
        // Option 3: Ignore it in the search result and fetch separately if needed.
        // Current implementation keeps it within the `value` object as returned.
        // If you need the mapped version:
        // const mappedDerived = Search.mapDerived(idea.derivedList);
        // const valueWithMappedDerived = { ...idea, derived: mappedDerived };

        return {
          id: idea.id,
          score: idea.distance ?? 0, // Use cosine similarity as the score
          value: {
            ...idea,
            type: "idea",
          }, // The full object as returned by the function (includes derivedList)
          highlightText: preview, // Basic preview for semantic-only
          debug: {
            semanticScore: idea.distance,
            source: "semantic",
          },
        };
      });
    } catch (error) {
      console.error("Error during semantic search:", error);
      return undefined;
    }
  }

  /**
   * Provides search suggestions, currently based *only* on FTS results
   * using the original `fn::search_user_ideas_fts`.
   * Returns standard ISearchResult format.
   */
  static async suggest(
    userId: string,
    query: string,
  ): Promise<IIdea[] | undefined> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    try {
      const suggestions = await Search.ftsSearch(userId, query);
      const ideas = suggestions?.map((i) => {
        return {
          ...(i.value as IIdea),
          type: "idea",
        };
      });
      return ideas;
    } catch (error) {
      console.error("Error during suggest:", error);
      return undefined;
    }
  }

  /**
   * Performs a comprehensive search combining FTS and Semantic search results
   * using the original database functions.
   * Falls back to FTS if embeddings cannot be generated for the query.
   * Returns results in the standardized ISearchResult format, ranked by a combined score.
   */
  static async comprehensiveSearch(
    userId: string, // Expecting 'user:id' format here now, consistent with function calls
    query: string,
    options: { limit?: number } = {},
  ): Promise<ISearchResult[] | undefined> {
    const limit = options.limit ?? 50;
    const initialFetchLimit = Math.max(limit * 2, 20); // Fetch more for ranking
    const queryLower = query.toLowerCase().trim();

    try {
      // 1. Attempt to generate query embedding
      const embeddingProcessor = new Embeddings();
      let queryEmbedding: number[] | null = null;
      try {
        queryEmbedding = await embeddingProcessor.generateEmbeddings(query);
      } catch (embeddingError) {
        console.warn(
          `Failed to generate query embedding for query "${query}":`,
          embeddingError,
        );
        // Continue with FTS fallback
      }

      // 2. Fetch Results (using the standardized methods)
      let ftsResults: ISearchResult[] | undefined;
      let semanticResults: ISearchResult[] | undefined;

      // Always perform FTS search
      ftsResults = await Search.ftsSearch(userId, query);
      if (ftsResults === undefined) {
        console.error(
          "Comprehensive Search: FTS search phase failed critically.",
        );
        return undefined; // FTS error is critical for fallback too
      }

      // Perform semantic search *only if* query embedding was successful
      if (queryEmbedding) {
        semanticResults = await Search.semanticSearch(
          userId,
          queryEmbedding,
          initialFetchLimit,
        );
        if (semanticResults === undefined) {
          console.warn(
            "Comprehensive Search: Semantic search phase failed. Proceeding with FTS results only.",
          );
          // Non-fatal: proceed without semantic results
        }
      } else {
        console.log(
          `Comprehensive Search: No query embedding. Using FTS results only for query "${query}".`,
        );
      }

      // 3. Merge and Score Results
      const combinedResults: Map<string, ISearchResult> = new Map();

      // Process FTS results first (these provide base + highlights)
      for (const ftsRes of ftsResults) {
        const id = ftsRes.id.toString(); // Use string ID for Map key consistency
        const idea = ftsRes.value as IIdea; // Asserting type for access

        // Base score from FTS weights
        let score =
          (ftsRes.debug?.ftsTitleScore ?? 0) *
            Search.COMPREHENSIVE_WEIGHTS.FTS_TITLE +
          (ftsRes.debug?.ftsContentScore ?? 0) *
            Search.COMPREHENSIVE_WEIGHTS.FTS_CONTENT;

        // Apply exact title bonus
        const exactTitleBonus =
          idea.title?.toLowerCase().trim() === queryLower
            ? Search.EXACT_TITLE_BONUS
            : 0;
        // BILAL IDEA: we need to nerf exact title bonus
        score += exactTitleBonus;

        combinedResults.set(id, {
          ...ftsRes,
          // highlightText already set by ftsSearch from 'preview'
          score: score, // Score based on FTS + title bonus
          debug: {
            ...ftsRes.debug, // Includes fts scores and 'fts' source
            exactTitleBonus: exactTitleBonus,
            // Source will be updated to 'hybrid' if semantic match found
            source: queryEmbedding ? "hybrid" : "fts",
          },
        });
      }

      // Merge Semantic results (if available and above threshold)
      if (semanticResults) {
        for (const semRes of semanticResults) {
          const id = semRes.id.toString();
          const semanticScore = semRes.debug?.semanticScore ?? 0;

          if (semanticScore >= Search.SEMANTIC_THRESHOLD) {
            const existing = combinedResults.get(id);
            const semanticContribution =
              semanticScore * Search.COMPREHENSIVE_WEIGHTS.SEMANTIC;
            const idea = semRes.value as IIdea; // Assert type

            if (existing) {
              // Found by both: Add semantic score, update debug info
              existing.score += semanticContribution;
              existing.debug = {
                ...existing.debug,
                semanticScore: semanticScore,
                source: "hybrid", // Mark clearly as hybrid
              };
              // Keep FTS highlightText from existing entry
            } else {
              // Found only by Semantic (above threshold): Add as new entry
              const exactTitleBonus =
                idea.title?.toLowerCase().trim() === queryLower
                  ? Search.EXACT_TITLE_BONUS
                  : 0;

              combinedResults.set(id, {
                ...semRes, // Use semantic result as base
                // highlightText will be the basic preview generated by semanticSearch
                score: semanticContribution + exactTitleBonus,
                debug: {
                  ...semRes.debug, // Includes semantic score
                  exactTitleBonus: exactTitleBonus,
                  source: "hybrid", // Found semantically in hybrid search context
                },
              });
            }
          }
        }
      }

      // 4. Final Ranking and Selection
      const finalResults = Array.from(combinedResults.values());
      finalResults.sort((a, b) => b.score - a.score); // Sort descending by score

      return finalResults.slice(0, limit);
    } catch (error) {
      console.error(
        `Error during comprehensive search for query "${query}":`,
        error,
      );
      return undefined;
    }
  }

  static async getOverviewFromResults(
    query: string,
    results: ISearchResult[],
  ): Promise<ISearchOverview | undefined> {
    try {
      if (results.length === 0) {
        return {
          findings: [],
          overview: "There were no results to analyze.",
        };
      }
      const resultsStrings = results
        .filter((r) => {
          return r.value.type === "idea";
        })
        .map((result) => {
          let r = "";
          const { highlightText, value } = result;
          const ideaValue = value as IIdea;
          r += `**${ideaValue.title}** | ID: ${ideaValue.id.toString()}`;
          if (highlightText) {
            r += `System Highlighted Text: ${highlightText}`;
          }
          r += `${htmlToMarkdown(ideaValue.content)}`;
          return r;
        });
      const overviewPrompt = new PromptBuilder()
        .addText("You are a search overview creator.")
        .addBlock(
          "Instructions",
          `Generate a comprehensive and informative answer to the user's query, based entirely on the results provided. You will generate the answer in two parts:
          1. Findings: a list of individual findings from the results, along with the result referenced, and relevant excerpt. It is EXTREMELY important that this stage be entirely based on the results provided, with your analysis being derived directly from relevant excerpts from the result.
          2. Overview: once your findings are complete, you will generate a brief, direct answer to the user's query, based entirely on the results of your findings. This doesn't need to have references, and will essentially tie your generation up in a neat bow.`,
        )
        .addBlock("Results", "The results to use are as follows:\n")
        .addBlock(
          "Query",
          `The user's query is as follows:
          > ${query}`,
        )
        .addBlock("Context", `It is currently ${getFormattedDateTimeToday()}.`)
        .addBlock(
          "Please Remember!",
          `
        - Is is of the upmost importance that findings be directly sourced from the results
        - The overview, on the other hand, should rely on findings, but ultimately favor answering the query
        - If you do not know something from the results, don't be afraid to say you don't know.
        - Format **the overview** as Markdown, tags are allowed, this can be formatted in accordance with the user query
          `,
        );

      resultsStrings.forEach((s, i) => {
        // make sure we don't surpass lm prompt size
        const totalSize = overviewPrompt.get().length;
        if (totalSize + s.length > max_lm_prompt_size) {
          return;
        }
        overviewPrompt.addBlock(`Result ${i + 1}`, s, 2);
      });

      const lm = getLM().withModel("simple");
      const result = await lm.generateJSON<ISearchOverview>(
        overviewPrompt.get(),
        {
          type: SchemaType.OBJECT,
          properties: {
            findings: {
              type: SchemaType.ARRAY,
              description: "Your findings directly from the source results",
              items: {
                type: SchemaType.OBJECT,
                description: "An individual finding from the source results",
                properties: {
                  sourceId: {
                    type: SchemaType.STRING,
                    description: "The id of the result you're sourcing",
                  },
                  excerpt: {
                    type: SchemaType.STRING,
                    description: "The relevant portion of the source result",
                  },
                  analysis: {
                    type: SchemaType.STRING,
                    description:
                      "Your finding from this excerpt, how it relates to the query",
                  },
                },
                required: ["sourceId", "excerpt", "analysis"],
              },
            },
            overview: {
              type: SchemaType.STRING,
              description:
                "A direct response to the user's query based on the findings.",
            },
          },
          required: ["findings", "overview"],
        },
      );
      if (!result) {
        throw new Error("overview not generated by LM");
      }
      return result;
    } catch (error) {
      console.error("Error getting overview from results:", error);
      return undefined;
    }
  }

  static async ftsSearchTags(
    userId: string,
    query: string,
    options?: { limit?: number },
  ): Promise<ITagSearchResult[]> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error(
          "Database connection not available for FTS tag search.",
        );
      }
      const limit = options?.limit ?? 10;

      const dbResults = await db.run<
        (ITag & {
          nameScore: number;
          descriptionScore: number;
          preview: string;
        })[]
      >("fn::search_user_tags_fts", [new StringRecordId(userId), query, limit]);

      if (!dbResults || dbResults.length === 0 || !dbResults[0]) {
        throw new Error("Couldn't get results");
      }

      return dbResults.map((tag) => ({
        id: tag.id,
        value: tag,
        score: tag.nameScore + tag.descriptionScore,
        searchType: "fts",
      }));
    } catch (error) {
      console.error("Error during FTS tag search:", error);
      return [];
    }
  }

  static async semanticSearchTags(
    userId: string,
    embedding: number[],
    options?: { limit?: number; threshold?: number },
  ): Promise<ITagSearchResult[]> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error(
          "Database connection not available for semantic tag search.",
        );
      }
      const limit = options?.limit ?? 10;
      const threshold = options?.threshold ?? Search.SEMANTIC_THRESHOLD; // Use existing threshold or define a new one for tags

      const dbResults = await db.run<(ITag & { score: number })[]>(
        "fn::search_similar_tags_to_embeddings",
        [new StringRecordId(userId), embedding, limit, threshold],
      );

      if (!dbResults || dbResults.length === 0 || !dbResults[0]) {
        throw new Error("Couldn't get results");
      }

      return dbResults.map((tag) => ({
        id: tag.id.toString(),
        value: tag,
        score: tag.score,
        searchType: "semantic",
      }));
    } catch (error) {
      console.error("Error during semantic tag search:", error);
      return [];
    }
  }

  static async comprehensiveSearchTags(
    userId: string,
    query: string,
    options?: { limit?: number },
  ): Promise<ITagSearchResult[]> {
    try {
      const limit = options?.limit ?? 10;

      const embeddingProcessor = new Embeddings();
      const embedding = await embeddingProcessor.generateEmbeddings(query);

      const ftsResults = await Search.ftsSearchTags(userId, query, { limit });
      let semanticResults: ITagSearchResult[] = [];
      if (embedding) {
        semanticResults = await Search.semanticSearchTags(userId, embedding, {
          limit,
        });
      }

      const combinedResultsMap = new Map<string, ITagSearchResult>();

      // Process FTS results
      for (const result of ftsResults) {
        combinedResultsMap.set(result.id.toString(), {
          ...result,
          score: result.score * 0.4,
        }); // Weight FTS score
      }

      // Process Semantic results
      for (const result of semanticResults) {
        if (combinedResultsMap.has(result.id.toString())) {
          const existing = combinedResultsMap.get(result.id.toString())!;
          existing.score += result.score * 0.6; // Add weighted semantic score
          // Potentially mark as 'comprehensive' or note both sources
          existing.searchType = "comprehensive";
        } else {
          combinedResultsMap.set(result.id.toString(), {
            ...result,
            score: result.score * 0.6,
            searchType: "comprehensive",
          });
        }
      }

      const finalResults = Array.from(combinedResultsMap.values());
      finalResults.sort((a, b) => b.score - a.score);

      return finalResults.slice(0, limit);
    } catch (error) {
      console.error("Error during comprehensive tag search:", error);
      return [];
    }
  }

  /**
   * Provides search suggestions for tags using FTS.
   * @param userId The ID of the user.
   * @param query The search query string.
   * @param options Optional parameters.
   * @param options.limit The maximum number of suggestions to return (default: 5).
   * @returns A promise resolving to an array of ITagSearchResult.
   */
  static async suggestTags(
    userId: string,
    query: string,
    options?: { limit?: number },
  ): Promise<ITag[]> {
    try {
      const limit = options?.limit ?? 5; // Default limit for suggestions
      const results = await Search.ftsSearchTags(userId, query, { limit });
      return results.map((tag) => {
        return tag.value;
      });
    } catch (error) {
      console.error("Error during tag suggestions search:", error);
      return [];
    }
  }
}

export const initSearch = async () => {
  console.log("Initializing Search Service (using original definitions)...");
  await Search.up();
};

export const dropSearch = async () => {
  console.log("Dropping Search Service Indexes/Functions...");
  await Search.down();
};
