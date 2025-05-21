import { RecordId } from "surrealdb";
import { getDatabase } from "../database/db";
// Make sure IIdea includes all fields returned by your functions,
// including potentially embeddings, contentPlain etc.
import {
  Idea,
  IIdea,
  IIdeaAsRelation,
  IIdeaDerived,
  IIdeaDerivedMap,
} from "../database/models/ideas";
import { IUserFile } from "../database/models/userfile";
import { Embeddings } from "../semantics/embeddings";
import { getLM, PromptBuilder } from "../semantics/lm";
import { htmlToMarkdown } from "../utils/formatting";
import { SchemaType } from "@google/generative-ai";
import { max_lm_prompt_size } from "../settings";

// --- Standardized Search Result Types ---

// Define the possible value types a search result can represent
export type ISearchResultValue =
  | (IIdea & {
      type: "idea";
    })
  | (IUserFile & {
      type: "file";
    }); // Keep flexible for future

// The standardized structure for returning search results
export type ISearchResult = {
  id: string | RecordId; // Unique ID of the result item (e.g., 'idea:uuid')
  score: number; // Final combined or specific score for ranking
  value: ISearchResultValue; // The actual data object (IIdea or IUserFile)
  highlightText?: string; // Highlighted snippet (from FTS 'preview' if available)
  debug?: {
    semanticScore?: number; // Score from vector similarity ('distance')
    ftsContentScore?: number; // Score from FTS content match
    ftsTitleScore?: number; // Score from FTS title match
    exactTitleBonus?: number; // Bonus applied for exact title match
    source: "semantic" | "fts" | "hybrid"; // Origin of the result determination
  };
};

// Type matching the exact output of your original fn::search_user_ideas_fts
export type IFTSIdeaResult = IIdea & {
  // Ensure IIdea includes contentPlain, title, etc. required by the query
  contentScore: number;
  titleScore: number;
  preview: string; // Contains '->' and '<-' markers
};

// Type matching the output of fn::search_similar_to_embeddings (includes distance)
// Note: Your original function also selected derivedList. Ensure IIdeaAsRelation includes it.
export type ISemanticIdeaResult = IIdeaAsRelation & {
  // IIdeaAsRelation should include IIdea fields + distance + derivedList
};

export type ISearchOverview = {
  overview: string;
};

// --- Refactored Search Service ---

export class Search {
  // Weights and constants for comprehensive search scoring (tune as needed)
  private static readonly COMPREHENSIVE_WEIGHTS = {
    SEMANTIC: 1.5,
    FTS_TITLE: 1.0,
    FTS_CONTENT: 0.5,
  };
  private static readonly EXACT_TITLE_BONUS = 2.0;
  private static readonly SEMANTIC_THRESHOLD = 0.45; // Min cosine similarity

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

    const ideaSearchAnalyzer = () => {
      return `
      DEFINE ANALYZER OVERWRITE idea_analyzer
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
      REMOVE INDEX idx_idea_content_fts ON TABLE idea;

      DEFINE INDEX OVERWRITE idx_idea_content_fts
        ON TABLE idea
        FIELDS contentPlain
        SEARCH ANALYZER idea_analyzer
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

    // Uses the exact function definition from the initial prompt
    const searchSimilarToIdea = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::search_similar_to_idea(
        $ideaId: string,
        $userId: string,
        $limit: int
      ) {
        LET $embeddings = SELECT VALUE embeddings FROM ONLY <record> $ideaId;

        IF !$embeddings THEN RETURN [] END;

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
            ORDER BY distance DESC
            LIMIT <int> $limit;

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
        $limit: int
      ) {
        IF !$provided_embeddings THEN return [] END;

        LET $results =
            SELECT
                *,
                vector::similarity::cosine(embeddings, $provided_embeddings) AS distance,
                ->is_source_for->(?).* as derivedList -- Includes derivedList
            FROM idea
            WHERE
              <-owns<-(user WHERE id = <record> $userId)
              AND !!content
              AND !!embeddings
            ORDER BY distance DESC
            LIMIT $limit;

        RETURN $results;
      }
          `;
    };

    try {
      const db = await getDatabase();
      if (!db) throw new Error("Database not initialized for Search.up");
      console.log(
        "Defining search analyzers, indexes, and functions (using original definitions)...",
      );
      // Execute the original definitions
      console.info("Running idea search analyzer...");
      await db.query(ideaSearchAnalyzer());
      console.info("Running fts title search index");
      await db.query(ftsTitleSearchIndex());
      console.info("Running fts content search index");
      await db.query(ftsContentSearchIndex());
      console.info("Running fts search function");
      await db.query(ftsSearchFunction());
      console.info("Running fts search function initializer");
      await db.query(searchSimilarToIdea());
      console.info("Running search similar to embeddings initializer");
      await db.query(searchSimilarToEmbeddings());
      console.info("Running define vector index");
      await db.query(defineVectorIndex());
      console.log("Search setup complete (using original definitions).");
    } catch (error) {
      console.error("Error during Search.up():", error);
      throw error;
    }
  }

  /**
   * Optional: Removes search indexes and functions.
   */
  static async down() {
    // Implement DROP ANALYZER, DROP INDEX, REMOVE FUNCTION if needed
    // Example:
    // const db = await getDatabase();
    // await db?.query("REMOVE INDEX idx_idea_title_fts;");
    // await db?.query("REMOVE INDEX idx_idea_content_fts;");
    // await db?.query("REMOVE FUNCTION fn::search_user_ideas_fts;");
    // ... etc.
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
    const limit = options.limit ?? 10;
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
          `When given a series of search results, and a users query, your goal is to create a concise and informative overview of the search results that is relevant to the user's query. Your overview should be informative, but concise. It should include key information sourced from the results, based on relevance to the users query, such as snippets, summaries, etc. The goal is ultimately to provide an answer to the user's query based exclusively on the results, not to summarize the results directly. Cite your sources accurately, providing source id and relevant excerpt always if available.`,
        )
        .addList("Additional Instructions", [
          "Use HTML in your answer for proper formatting",
          "If you use information from a note, please cite it along with relevant text",
        ])
        .addBlock(
          "Citation Instructions",
          `For any inline citation, format it as such:
          > Some text <span data-citation-id="<id of result>">relevant excerpt from cited result</span> more text.

          Citations must include the quoted text from the original result that is being cited.`,
        )
        .addBlock(
          "Query",
          `The user's query is as follows:
          > ${query}`,
        )
        .addBlock("Results", "The results to use are as follows:\n");

      resultsStrings.forEach((s, i) => {
        // make sure we don't surpass lm prompt size
        const totalSize = overviewPrompt.get().length;
        if (totalSize + s > max_lm_prompt_size) {
          return;
        }
        overviewPrompt.addBlock(`Result ${i + 1}`, s, 2);
      });

      console.log("Sending prompt: ", overviewPrompt.get());

      const lm = getLM().withModel("simple");
      const result = await lm.generateJSON<ISearchOverview>(
        overviewPrompt.get(),
        {
          type: SchemaType.OBJECT,
          properties: {
            overview: {
              type: SchemaType.STRING,
              description: "The overview of the results",
            },
          },
          required: ["overview"],
        },
      );
      console.log("Got result: ", result);
      if (!result) {
        throw new Error("overview not generated by LM");
      }
      return result;
    } catch (error) {
      console.error("Error getting overview from results:", error);
      return undefined;
    }
  }
}

// --- Initialization functions ---
export const initSearch = async () => {
  console.log("Initializing Search Service (using original definitions)...");
  await Search.up();
};

export const dropSearch = async () => {
  console.log("Dropping Search Service Indexes/Functions...");
  await Search.down();
};
