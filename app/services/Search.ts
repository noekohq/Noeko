import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../database/db";
import { IIdea, IIdeaAsRelation } from "../database/models/ideas";
import { IUserFile } from "../database/models/userfile";
import { Embeddings } from "../semantics/embeddings";
import { getLM, PromptBuilder } from "../semantics/lm";
import { htmlToMarkdown } from "../utils/formatting";
import { ResponseSchema, SchemaType } from "@google/generative-ai";
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

export type IFindingType =
  // FOUNDATIONAL
  | "FACT"
  | "CONTRADICTION"
  | "DEFINITION"
  // DIRECT ANSWER TYPES
  | "EXPLANATION"
  | "EXAMPLE"
  | "PROCEDURE"
  // PERSONAL & REFLECTIVE
  | "PERSONAL_INSIGHT"
  | "TAKEAWAY"
  | "OPEN_QUESTION"
  | "ACTION_ITEM"
  | "KNOWLEDGE_GAP"
  // STRUCTURAL AND REFERENCE TYPES
  | "REFERENCE"
  | "QUOTE"
  | "COMPARISON";

export const FindingTypes = [
  "FACT",
  "CONTRADICTION",
  "DEFINITION",
  "EXPLANATION",
  "EXAMPLE",
  "PROCEDURE",
  "PERSONAL_INSIGHT",
  "TAKEAWAY",
  "OPEN_QUESTION",
  "ACTION_ITEM",
  "REFERENCE",
  "QUOTE",
  "COMPARISON",
] as IFindingType[];

export type IFinding = {
  excerpt: string;
  sourceId: string;
  analysis: string;
  findingType: IFindingType;
};

export type ISearchOverview = {
  findings: IFinding[];
  overview: string;
};

export type ITagSearchResultValue = ITag;

export type ITagSearchResult = {
  id: string | RecordId;
  value: ITagSearchResultValue;
  score: number;
  searchType: "fts" | "semantic" | "comprehensive";
};

const queryModes: {
  name: string;
  description: string;
  specificInstructions: string[];
}[] = [
  {
    name: "Synthesis Report",
    description:
      "This is the standard mode for general knowledge queries, the goal is to provide a comprehensive and detailed answer that covers all aspects of the user's query.",
    specificInstructions: [
      "Start with a brief, one-paragraph summary of the key information.",
      "Structure the main body of the response using headings for sub-topics.",
      "Prioritize FACT, DEFINITION, and EXPLANATION findings to build the core of the report.",
      "Weave in PERSONAL_INSIGHT and QUOTE findings to add color and personal context, but they should support the main narrative, not lead it.",
      "Ensure the report is well-organized, coherent, and easy to follow.",
    ],
  },
  {
    name: "Insight Review",
    description:
      "This mode is for when the user wants to review their own thinking process. The goal is to provide a reflective experience and insight to the user's thought process, in accordance with their query.",
    specificInstructions: [
      "You MUST prioritize findings with the PERSONAL_INSIGHT type above all others. Also, give high priority to KEY_TAKEAWAY and OPEN_QUESTION.",
      "Structure the output as a narrative review. Use blockquotes (>) for direct PERSONAL_INSIGHT excerpts.",
      "The tone should be more reflective. It is acceptable to frame the answer from the user's perspective, for example: 'Your main insight was that...' or 'You seem to have concluded that...'",
      "Factual findings (FACT, DEFINITION) should only be used to provide brief context for the personal insights.",
    ],
  },
  {
    name: "Action Summary",
    description:
      "This mode is for when the user is planning or reviewing tasks. The goal is to provide a clear, actionable list of action items.",
    specificInstructions: [
      "Start with a concise overview of the user's action items",
      "Prioritize actionability on the user's behalf, providing only necessary context to take action on an item.",
      "You MUST only use findings with the ACTION_ITEM type to construct your todo-list",
      "Group related tasks under subheadings based on their source or topic.",
      "Prioritize flat text structure, avoid heading tags, use bold text for emphasis or categorization.",
      "use a standard list format to construct the lists.",
    ],
  },
  {
    name: "Comparative Analysis",
    description:
      "This mode is for when the user wants to understand the relationship between two or more concepts. Your goal is to create a structured comparison of the concepts mentioned in the query.",
    specificInstructions: [
      "You MUST format the core of your response as an HTML table with <table>.",
      "The table columns should be the items being compared (e.g., 'Permaculture', 'Syntropic Agroforestry')",
      "The table rows should be the criteria for comparison (e.g., 'Core Principles', 'Key Proponents', 'Implementation Challenges').",
      "Use FACT, DEFINITION, and KEY_TAKEAWAY findings to populate the table. Use CONTRADICTION findings to highlight key differences.",
      "Conclude with a brief summary paragraph highlighting the most significant similarities and differences.",
    ],
  },
  {
    name: "Question Drilldown",
    description:
      "This mode is for exploring the user's knowledge gaps. Your goal is to help a user understand the gaps in their knowledge, and unanswered questions they have.",
    specificInstructions: [
      "The lack of a relevant finding that should be there implies a gap in knowledge",
      "Only in this mode may you reference content that isn't specifically included in findings.",
      "Use KNOWLEDGE_GAP findings to identify gaps in the user's knowledge. As well as OPEN_QUESTION findings to identify unanswered questions.",
      "Conclude with a brief summary paragraph highlighting the most significant knowledge gaps and steps to address them.",
    ],
  },
];

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
            search::score(1) AS titleScore,
            string::similarity::jaro_winkler($query, title) AS titleSimilarity
        FROM idea
        WHERE
            ((contentPlain @0@ $query OR title @1@ $query)
            OR string::similarity::jaro_winkler($query, title) > 0.7f)
            AND <-owns<-(user WHERE id = <record> $userId)
        ORDER BY
            titleSimilarity DESC,
            contentScore DESC,
            titleScore DESC;

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
              AND (
                !!embeddings
                AND vector::similarity::cosine(embeddings, $provided_embeddings) >= $got_threshold
              )
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
        console.warn(
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
          return r.value?.type === "idea";
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
      const overviewPrompt = this.findingsPromptBuilder(query);

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

  static findingsPromptBuilder(query: string) {
    return (
      new PromptBuilder()
        // --- Insight: Stronger, more specific persona.
        .addText(
          "You are a data extraction and analysis engine called Spyglass Analyst. Your sole purpose is to extract relevant information from a given text based on a user query.",
        )
        .addBlock(
          "Purpose and Goal",
          `
          Your goal is to provide the most relevant excerpts to the query from the provided results.
          Quality of analysis is paramount for quality search experience for your users, you exist to provide an additional layer of intelligence and context.
          Your analysis will be built upon by other systems, so it's crucial to be reliable, precise, and foreward-thinking.
          Your primary source of context is the user's query. Use it to inform each finding directly. If something isn't relevant
          to the query's intent, don't include it.
          `,
        )
        .addBlock(
          "Instructions",
          // --- Insight: Mandate a structured, machine-readable output (JSON). This is the most critical improvement.
          `
        Analyze the provided search results in relation to the user's query.
        Extract every relevant portion of a result as a "finding".
        For each finding, you MUST provide the source ID and the direct excerpt from the source that supports it.
        `,
        )
        .addBlock("User Query", query)
        // --- Insight: Consolidate and strengthen constraints.
        .addBlock(
          "Strict Rules",
          `
        - **DO NOT** interpret or infer information not present in the results.
        - **DO NOT** add your own knowledge.
        - **DO NOT** synthesize or combine findings. Each finding must be a discrete piece of information from a single source.
        `,
        )
        .addBlock("Search Results", "The results to use are as follows:\n")
    );
  }

  static findingsSchema(): ResponseSchema {
    return {
      type: SchemaType.ARRAY,
      description:
        "An array of structured findings extracted from the source results that are relevant to the user's query.",
      items: {
        type: SchemaType.OBJECT,
        description:
          "A single, discrete finding that helps answer the user's query.",
        properties: {
          sourceId: {
            type: SchemaType.STRING,
            description:
              "The unique ID of the source result from which the excerpt is taken.",
          },
          excerpt: {
            type: SchemaType.STRING,
            description:
              "The verbatim, direct quote from the source text that supports the finding. This must not be altered or summarized.",
          },
          analysis: {
            type: SchemaType.STRING,
            description:
              "A brief, one-sentence explanation of *why* this excerpt is important and how it directly helps answer the user's query.",
          },
          // --- Updated the enum with the new, more detailed taxonomy for qwest.
          findingType: {
            type: SchemaType.STRING,
            description:
              "Categorize the nature of the finding in relation to the query, based on the nature of personal knowledge-bases.",
            enum: [
              // Foundational Evidence
              "FACT",
              "CONTRADICTION",
              "DEFINITION",
              // Explanatory & Procedural
              "EXPLANATION",
              "EXAMPLE",
              "PROCEDURE",
              // Personal & Reflective
              "PERSONAL_INSIGHT",
              "KEY_TAKEAWAY",
              "OPEN_QUESTION",
              "ACTION_ITEM",
              // Structural & Reference
              "REFERENCE",
              "QUOTE",
            ],
            format: "enum",
          },
        },
        required: ["sourceId", "excerpt", "analysis", "findingType"],
      },
    };
  }

  static overviewPromptBuilder(query: string) {
    return (
      new PromptBuilder()
        // --- Insight: Adopting the more polished persona we discussed.
        .addText(
          "You are Spyglass, a helpful and comprehensive AI search assistant. Your goal is to provide an accurate, unbiased, and expertly written answer to the user's query by synthesizing the provided findings.",
        )
        .addBlock("User Query", query)
        .addBlock("Context", `It is currently ${getFormattedDateTimeToday()}.`)
        .addBlock(
          "Core Instructions",
          `
        - Write a direct and comprehensive answer to the user query using ONLY the information from the "Findings" provided below.
        - Begin your answer with a concise introductory sentence or paragraph that summarizes the key points.
        - Structure the rest of your answer logically using headings and lists.
        - Attend ABOVE ALL ELSE to the user's query, ensuring that your response satisfies the intent of the user.
        - Prioritize the most useful information first, then elaborate if need be.
        `,
        )
        .addBlock(
          "Query Type Specification",
          `
          You must use different instructions to write your answer based on the type of the user's query. However, be sure to also follow the Core Instructions, especially if the query doesn't match any of the defined types below. Here are the supported types.

          ${queryModes
            .map((query) => {
              return `
            ## ${query.name}
            ${query.description}
            ${query.specificInstructions
              .map((instruction) => {
                return `- ${instruction}`;
              })
              .join("\n")}
            `;
            })
            .join("\n\n")}
          `,
        )
        // --- Insight: Adding the critical citation mandate and strict formatting rules.
        .addBlock(
          "Formatting",
          `
        - Format your entire response using Markdown, and HTML where applicable.
        - ALWAYS USE HTML for the following:
          - Tables with <table>
          - Lists with <ul> and <li>
          - Code blocks with <pre> and <code>
        `,
        )
        // --- Insight: Adding the full suite of negative constraints for safety and professionalism.
        .addBlock(
          "Strict Rules (NEVER/AVOID)",
          `
        - **NEVER** use information that is not explicitly present in the Findings. If the Findings do not contain the answer, state that you cannot answer based on the information provided.
        - **NEVER** use moralizing or hedging language (e.g., "It is important to...", "It is subjective...").
        - **NEVER** refer to yourself as an AI, a model, or an assistant. Your name is Spyglass, but do not refer to yourself in the answer.
        - **NEVER** start your answer with a heading.
        `,
        )
        .addBlock(
          "Findings",
          "The findings to use for your answer are as follows:\n",
        )
    ); // This will be the JSON from the first step.
  }

  static async getFindingsFromResults(
    query: string,
    results: ISearchResult[],
  ): Promise<ISearchOverview["findings"] | undefined> {
    try {
      if (results.length === 0) {
        return [];
      }
      const resultsStrings = results
        .filter((r) => {
          return r.value?.type === "idea";
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
      const overviewPrompt = this.findingsPromptBuilder(query);

      resultsStrings.forEach((s, i) => {
        // make sure we don't surpass lm prompt size
        const totalSize = overviewPrompt.get().length;
        if (totalSize + s.length > max_lm_prompt_size) {
          return;
        }
        overviewPrompt.addBlock(`Result ${i + 1}`, s, 2);
      });

      const lm = getLM().withModel("simple");
      const result = await lm.generateJSON<ISearchOverview["findings"]>(
        overviewPrompt.get(),
        this.findingsSchema(),
      );
      if (!result) {
        throw new Error("Findings not generated by LM");
      }
      return result;
    } catch (error) {
      console.error("Error getting findings from results:", error);
      return undefined;
    }
  }

  static async *generateFindingsFromResults(
    query: string,
    results: ISearchResult[],
  ): AsyncGenerator<string, void, unknown> {
    try {
      if (results.length === 0) {
        yield `[]`;
        return;
      }
      const resultsStrings = results
        .filter((r) => {
          return r.value?.type === "idea";
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
      const overviewPrompt = this.findingsPromptBuilder(query);

      resultsStrings.forEach((s, i) => {
        // make sure we don't surpass lm prompt size
        const totalSize = overviewPrompt.get().length;
        if (totalSize + s.length > max_lm_prompt_size) {
          return;
        }
        overviewPrompt.addBlock(`Result ${i + 1}`, s, 2);
      });

      const lm = getLM().withModel("simple");
      for await (const result of lm.generateJSONStream(
        overviewPrompt.get(),
        this.findingsSchema(),
      )) {
        if (!result) {
          throw new Error("Findings not generated by LM");
        }
        yield result;
      }
    } catch (error) {
      console.error("Error generating findings from results:", error);
      throw error;
    }
  }

  static async getOverviewFromFindings(
    query: string,
    findings: ISearchOverview["findings"],
  ): Promise<ISearchOverview["overview"] | undefined> {
    try {
      if (findings.length === 0) {
        return "There were no results to analyze.";
      }
      const findingsString = findings.map((finding) => {
        let t = "";
        const { excerpt, analysis, sourceId, findingType } = finding;
        t += `**${sourceId}**`;
        t += `> ${htmlToMarkdown(excerpt)}`;
        t += `TYPE: ${findingType}`;
        t += `ANALYSIS: ${htmlToMarkdown(analysis)}`;
        return t;
      });
      const overviewPrompt = this.overviewPromptBuilder(query);

      findingsString.forEach((s, i) => {
        // make sure we don't surpass lm prompt size
        const totalSize = overviewPrompt.get().length;
        if (totalSize + s.length > max_lm_prompt_size) {
          return;
        }
        overviewPrompt.addBlock(`Result ${i + 1}`, s, 2);
      });

      const lm = getLM().withModel("simple");
      const result = await lm.generateJSON<ISearchOverview["overview"]>(
        overviewPrompt.get(),
        {
          type: SchemaType.STRING,
          description:
            "A direct response to the user's query based on the findings.",
        },
      );
      if (!result) {
        throw new Error("Findings not generated by LM");
      }
      return result;
    } catch (error) {
      console.error("Error getting findings from results:", error);
      return undefined;
    }
  }

  static async *generateOverviewFromFindings(
    query: string,
    findings: ISearchOverview["findings"],
  ): AsyncGenerator<string, void, unknown> {
    try {
      if (findings.length === 0) {
        yield "There were no results to analyze.";
        return;
      }
      const findingsString = findings.map((finding) => {
        let t = "";
        const { excerpt, analysis, sourceId, findingType } = finding;
        t += `**${sourceId}**`;
        t += `> ${htmlToMarkdown(excerpt)}`;
        t += `TYPE: ${findingType}`;
        t += `ANALYSIS: ${htmlToMarkdown(analysis)}`;
        return t;
      });
      const overviewPrompt = this.overviewPromptBuilder(query);
      findingsString.forEach((s, i) => {
        // make sure we don't surpass lm prompt size
        const totalSize = overviewPrompt.get().length;
        if (totalSize + s.length > max_lm_prompt_size) {
          return;
        }
        overviewPrompt.addBlock(`Finding ${i + 1}`, s, 2);
      });

      const lm = getLM().withModel("simple");
      for await (const chunk of lm.generateStream(overviewPrompt.get())) {
        yield chunk;
      }
    } catch (error) {
      console.error("Error generating overview stream from findings:", error);
      throw error;
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
  console.info("Initializing Search Service (using original definitions)...");
  await Search.up();
};

export const dropSearch = async () => {
  console.info("Dropping Search Service Indexes/Functions...");
  await Search.down();
};
