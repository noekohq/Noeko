import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../database/db";
import { IIdea, IIdeaAsRelation, IIdeaDerived } from "../database/models/ideas";
import { IUserFile } from "../database/models/userfile";
import { getEmbedder } from "../ai/embeddings/embeddings";
import { ITag } from "../database/models/tag";
import { IRabbithole } from "../database/models/rabbithole";
import { IFinding } from "./Spyglass";
import { ITask } from "../database/models/task";

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

export type IRabbitholeSearchResultValue = IRabbithole;

export type IRabbitholeSearchResult = {
  id: string | RecordId;
  value: IRabbitholeSearchResultValue;
  score: number;
  searchType: "fts" | "semantic" | "comprehensive";
};

export type ITaskSearchResultValue = ITask;

export type ITaskSearchResult = {
  id: string | RecordId;
  value: ITaskSearchResultValue;
  score: number;
  searchType: "fts" | "semantic" | "comprehensive";
};

export class Search {
  private static readonly COMPREHENSIVE_WEIGHTS = {
    SEMANTIC: 2,
    FTS_TITLE: 1.5,
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
      DEFINE INDEX IF NOT EXISTS idx_idea_embeddings
        ON TABLE idea
        FIELDS embeddings
        HNSW DIMENSION 768
        DIST COSINE
        TYPE F32
        M 32
        EFC 400;
      `;
    };

    const defineTagVectorIndex = () => {
      return `
      DEFINE INDEX IF NOT EXISTS idx_tag_embeddings
        ON TABLE tag
        FIELDS embeddings
        HNSW DIMENSION 768
        DIST COSINE
        TYPE F32;
      `;
    };

    const defineRabbitholeVectorIndex = () => {
      return `
      DEFINE INDEX IF NOT EXISTS idx_rabbithole_embeddings
        ON TABLE tag
        FIELDS embeddings
        HNSW DIMENSION 768
        DIST COSINE
        TYPE F32;
      `;
    };

    const defineTaskVectorIndex = () => {
      return `
      DEFINE INDEX IF NOT EXISTS idx_task_embeddings
        ON TABLE tag
        FIELDS embeddings
        HNSW DIMENSION 768
        DIST COSINE
        TYPE F32;
      `;
    };

    const defineSourceVectorIndex = () => {
      return `
      DEFINE INDEX IF NOT EXISTS idx_source_embeddings
        ON TABLE source
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
      FILTERS lowercase, snowball(english);`;
    };

    const tagSearchAnalyzer = () => {
      return `
      DEFINE ANALYZER OVERWRITE tag_analyzer
      TOKENIZERS class
      FILTERS lowercase, snowball(english);`;
    };

    const rabbitholeSearchAnalyzer = () => {
      return `
      DEFINE ANALYZER OVERWRITE rabbithole_analyzer
      TOKENIZERS class
      FILTERS lowercase, snowball(english);`;
    };

    const taskSearchAnalyzer = () => {
      return `
      DEFINE ANALYZER OVERWRITE task_analyzer
      TOKENIZERS class
      FILTERS lowercase, snowball(english);`;
    };

    const sourceSearchAnalyzer = () => {
      return `
      DEFINE ANALYZER OVERWRITE source_analyzer
      TOKENIZERS class
      FILTERS lowercase, snowball(english);`;
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

    const ftsRabbitholeSearchIndex = () => {
      return `
      DEFINE INDEX OVERWRITE idx_rabbithole_fts
        ON TABLE rabbithole
        FIELDS name
        SEARCH ANALYZER rabbithole_analyzer
        BM25 HIGHLIGHTS;
      `;
    };

    const ftsTaskDescriptionSearchIndex = () => {
      return `
          DEFINE INDEX OVERWRITE idx_task_description_fts
            ON TABLE task
            FIELDS name
            SEARCH ANALYZER task_analyzer
            BM25 HIGHLIGHTS;
          `;
    };

    const ftsSourceDisplayNameSearchIndex = () => {
      return `
      DEFINE INDEX OVERWRITE idx_source_display_name_fts
        ON TABLE source
        FIELDS displayName
        SEARCH ANALYZER source_analyzer
        BM25 HIGHLIGHTS;
      `;
    };

    const ftsSourceContentSearchIndex = () => {
      return `
      DEFINE INDEX OVERWRITE idx_source_content_fts
        ON TABLE source
        FIELDS content
        SEARCH ANALYZER source_analyzer
        BM25 HIGHLIGHTS;
      `;
    };

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
            ->is_source_for->(?).* as derivedList -- Includes derivedList
        OMIT embeddings
        FROM idea
        WHERE
            (contentPlain @0@ $query OR title @1@ $query)
            AND <-owns<-(user WHERE id = <record> $userId)
        ORDER BY
            titleScore DESC,
            contentScore DESC;

        return $ideas;
      }`;
    };

    const ftsSearchWithinRabbitholeFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::search_rabbithole_ideas_fts(
        $query: string,
        $rabbitholeId: string
      ) {
        LET $ideas = SELECT
            *,
            contentPlain,
            title,
            search::highlight("->", "<-", 0) AS preview, -- Uses -> <- markers
            search::score(0) AS contentScore,
            search::score(1) AS titleScore,
            ->is_source_for->(?).* as derivedList -- Includes derivedList
        OMIT embeddings
        FROM idea
        WHERE
            (contentPlain @0@ $query OR title @1@ $query) AND
            (
              id IN (
                SELECT VALUE
                  ->includes.out
                FROM ONLY <record> $rabbitholeId
              ) OR
              id IN (
                SELECT VALUE
                  ->includes->tag->describes.out
                FROM ONLY <record> $rabbitholeId
              )
            )
        ORDER BY
            titleScore DESC,
            contentScore DESC;

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
        OMIT embeddings
        FROM tag
        WHERE
            (name @0@ $query OR
            description @1@ $query)
            AND <-owns<-(user WHERE id = <record> $userId)
        LIMIT $limit;

        return $tags;
      }`;
    };

    const ftsSearchRabbitholesFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::search_user_rabbitholes_fts(
        $userId: record<user>,
        $query: string,
        $limit: int
      ) {
        LET $rabbitholes = SELECT
            *,
            name,
            description,
            search::highlight("->", "<-", 0) AS preview, -- Uses -> <- markers
            search::score(0) AS nameScore
        FROM rabbithole
        WHERE
            name @0@ $query
            AND <-owns<-(user WHERE id = <record> $userId)
        LIMIT $limit;

        return $rabbitholes;
      }`;
    };

    const ftsSearchTasksFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::search_user_tasks_fts(
        $userId: record<user>,
        $query: string,
        $limit: int
      ) {
        LET $tasks = SELECT
            *,
            name,
            search::highlight("->", "<-", 0) AS preview, -- Uses -> <- markers
            search::score(0) AS nameScore
        FROM task
        WHERE
            name @0@ $query
            AND <-owns<-(user WHERE id = <record> $userId)
        LIMIT $limit;

        return $tasks;
      }`;
    };

    const ftsSearchSourcesFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::search_user_sources_fts(
        $userId: record<user>,
        $query: string,
        $limit: int
      ) {
        LET $sources = SELECT
            *,
            displayName,
            content,
            search::highlight("->", "<-", 0) AS preview, -- Uses -> <- markers
            search::score(0) AS contentScore,
            search::score(1) AS displayNameScore
        OMIT embeddings
        FROM source
        WHERE
            (content @0@ $query OR displayName @1@ $query)
            AND <-owns<-(user WHERE id = <record> $userId)
        LIMIT $limit;

        return $sources;
      }`;
    };

    try {
      const db = await getDatabase();
      if (!db) throw new Error("Database not initialized for Search.up");
      console.info(
        "Defining search analyzers, indexes, and functions (using original definitions)...",
      );

      /* Ideas */
      await db.query(ideaSearchAnalyzer());
      await db.query(ftsTitleSearchIndex());
      await db.query(ftsContentSearchIndex());
      await db.query(defineVectorIndex());
      await db.query(ftsSearchFunction());

      /* Tags */
      await db.query(tagSearchAnalyzer());
      await db.query(ftsTagNameSearchIndex());
      await db.query(ftsTagDescriptionSearchIndex());
      await db.query(defineTagVectorIndex());
      await db.query(ftsSearchTagsFunction());

      /* Rabbitholes */
      await db.query(rabbitholeSearchAnalyzer());
      await db.query(ftsRabbitholeSearchIndex());
      await db.query(defineRabbitholeVectorIndex());
      await db.query(ftsSearchRabbitholesFunction());
      await db.query(ftsSearchWithinRabbitholeFunction());

      /* Tasks */
      await db.query(taskSearchAnalyzer());
      await db.query(defineTaskVectorIndex());
      await db.query(ftsTaskDescriptionSearchIndex());
      await db.query(ftsSearchTasksFunction());

      /* Sources */
      await db.query(defineSourceVectorIndex());
      await db.query(sourceSearchAnalyzer());
      await db.query(ftsSourceDisplayNameSearchIndex());
      await db.query(ftsSourceContentSearchIndex());
      await db.query(ftsSearchSourcesFunction());

      /* Search */
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

  static async ftsSearch(
    userId: string | RecordId,
    query: string,
    options?: {
      rabbitholeId?: string;
    },
  ): Promise<ISearchResult[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Database not initialized");

      const isRabbithole = options?.rabbitholeId !== undefined;
      const fn = isRabbithole
        ? "fn::search_rabbithole_ideas_fts"
        : "fn::search_user_ideas_fts";
      const args = isRabbithole
        ? [query, options?.rabbitholeId]
        : [userId, query];
      const results = await db.run<IFTSIdeaResult[]>(fn, args);

      if (!results) return [];

      return results.map((idea): ISearchResult => {
        const combinedFtsScore =
          (idea.titleScore ?? 0) + (idea.contentScore ?? 0);
        return {
          id: idea.id,
          score: combinedFtsScore,
          value: {
            ...idea,
            type: "idea",
          },
          highlightText: idea.preview,
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

  static async semanticSearch(
    userId: string | RecordId,
    embedding: number[],
    options: {
      limit?: number;
      threshold?: number;
      candidates?: number;
      rabbitholeId?: string;
    },
  ): Promise<ISearchResult[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Database not initialized");

      const limit = options.limit ?? 100;
      const defaultCandidates = 300;
      const candidates = options.candidates ?? defaultCandidates;

      const threshold = Number.parseFloat(String(options.threshold ?? 0.45));
      if (!Number.isFinite(threshold) || threshold < -1.0 || threshold > 1.0) {
        throw new Error("Invalid similarity threshold provided.");
      }

      const subqueryWhere = [`<-owns<-(user WHERE id = $userId)`];

      // Don't use index when within rabbithole
      if (!options.rabbitholeId) {
        subqueryWhere.push(`embeddings <|${limit}, ${candidates}|> $embedding`);
      }

      if (options.rabbitholeId) {
        subqueryWhere.push(`
          (
            id IN (SELECT VALUE ->includes.out FROM ONLY <record>$rabbitholeId) OR
            id IN (SELECT VALUE ->includes->tag->describes.out FROM ONLY <record>$rabbitholeId)
          )
        `);
      }

      const query = `
        SELECT * FROM (
          SELECT
            *,
            vector::similarity::cosine(embeddings, $embedding) AS distance,
            ->is_source_for->(?).* as derivedList
          OMIT embeddings
          FROM idea
          WHERE ${subqueryWhere.join(" AND ")}
        )
        WHERE distance >= ${threshold}
        ORDER BY distance DESC
        LIMIT ${limit};
      `;

      const [results] = await db.query<
        (IIdea & { distance: number; derivedList: IIdeaDerived[] })[][]
      >(query, {
        userId: new StringRecordId(userId),
        embedding: embedding,
        ...(options.rabbitholeId && {
          rabbitholeId: new StringRecordId(options.rabbitholeId),
        }),
      });

      if (!results) return [];

      return results.map((idea): ISearchResult => {
        const preview = idea.contentPlain
          ? idea.contentPlain.substring(0, 150) +
            (idea.contentPlain.length > 150 ? "..." : "")
          : (idea.title ?? "No Content");

        return {
          id: idea.id,
          score: idea.distance ?? 0,
          value: {
            ...idea,
            type: "idea",
          },
          highlightText: preview,
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

  static async searchByEmbedding(
    userId: string | RecordId,
    embedding: number[],
    options: {
      limit?: number;
      threshold?: number;
      candidates?: number;
      rabbitholeId?: string;
    } = {},
  ): Promise<ISearchResult[] | undefined> {
    try {
      const semanticResults = await Search.semanticSearch(userId, embedding, {
        limit: options.limit ?? 50,
        threshold: options.threshold,
        candidates: options.candidates,
        rabbitholeId: options.rabbitholeId,
      });

      return semanticResults;
    } catch (error) {
      console.error(`Error during search by embedding:`, error);
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
    options?: {
      rabbitholeId?: string;
    },
  ): Promise<IIdea[] | undefined> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    try {
      const suggestions = await Search.comprehensiveSearch(userId, query, {
        rabbitholeId: options?.rabbitholeId,
      });
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
    userId: string | RecordId,
    query: string,
    options: { limit?: number; rabbitholeId?: string } = {},
  ): Promise<ISearchResult[] | undefined> {
    const limit = options.limit ?? 50;
    const initialFetchLimit = Math.max(limit * 2, 20);
    const queryLower = query.toLowerCase().trim();

    try {
      const embeddingProcessor = getEmbedder();
      let queryEmbedding: number[] | null = null;
      try {
        queryEmbedding = await embeddingProcessor.embedContent(query);
      } catch (embeddingError) {
        console.warn(
          `Failed to generate query embedding for query "${query}":`,
          embeddingError,
        );
      }

      let ftsResults: ISearchResult[] | undefined;
      let semanticResults: ISearchResult[] | undefined;

      ftsResults = await Search.ftsSearch(userId, query, {
        rabbitholeId: options.rabbitholeId,
      });
      if (ftsResults === undefined) {
        console.error(
          "Comprehensive Search: FTS search phase failed critically.",
        );
        return undefined;
      }

      if (queryEmbedding) {
        semanticResults = await Search.semanticSearch(userId, queryEmbedding, {
          limit: initialFetchLimit,
          rabbitholeId: options.rabbitholeId,
        });
        if (semanticResults === undefined) {
          console.warn(
            "Comprehensive Search: Semantic search phase failed. Proceeding with FTS results only.",
          );
        }
      } else {
        console.warn(
          `Comprehensive Search: No query embedding. Using FTS results only for query "${query}".`,
        );
      }

      const combinedResults: Map<string, ISearchResult> = new Map();

      for (const ftsRes of ftsResults) {
        const id = ftsRes.id.toString();
        const idea = ftsRes.value as IIdea;

        let score =
          (ftsRes.debug?.ftsTitleScore ?? 0) *
            Search.COMPREHENSIVE_WEIGHTS.FTS_TITLE +
          (ftsRes.debug?.ftsContentScore ?? 0) *
            Search.COMPREHENSIVE_WEIGHTS.FTS_CONTENT;

        const exactTitleBonus =
          idea.title?.toLowerCase().trim() === queryLower
            ? Search.EXACT_TITLE_BONUS
            : 0;
        // BILAL IDEA: we need to nerf exact title bonus
        score += exactTitleBonus;

        combinedResults.set(id, {
          ...ftsRes,
          score: score,
          debug: {
            ...ftsRes.debug,
            exactTitleBonus: exactTitleBonus,
            source: queryEmbedding ? "hybrid" : "fts",
          },
        });
      }

      if (semanticResults) {
        for (const semRes of semanticResults) {
          // console.log("Semantic result: ", semRes);
          const id = semRes.id.toString();
          const semanticScore = semRes.debug?.semanticScore ?? 0;

          if (semanticScore >= Search.SEMANTIC_THRESHOLD) {
            const existing = combinedResults.get(id);
            const semanticContribution =
              semanticScore * Search.COMPREHENSIVE_WEIGHTS.SEMANTIC;
            const idea = semRes.value as IIdea;

            if (existing) {
              existing.score += semanticContribution;
              existing.debug = {
                ...existing.debug,
                semanticScore: semanticScore,
                source: "hybrid",
              };
            } else {
              const exactTitleBonus =
                idea.title?.toLowerCase().trim() === queryLower
                  ? Search.EXACT_TITLE_BONUS
                  : 0;

              combinedResults.set(id, {
                ...semRes,
                score: semanticContribution + exactTitleBonus,
                debug: {
                  ...semRes.debug,
                  exactTitleBonus: exactTitleBonus,
                  source: "hybrid",
                },
              });
            }
          }
        }
      }

      const finalResults = Array.from(combinedResults.values());
      finalResults.sort((a, b) => b.score - a.score);

      return finalResults.slice(0, limit);
    } catch (error) {
      console.error(
        `Error during comprehensive search for query "${query}":`,
        error,
      );
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

      if (!dbResults) {
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
    userId: string | RecordId,
    embedding: number[],
    options: {
      limit?: number;
      threshold?: number;
      candidates?: number;
    },
  ): Promise<ITagSearchResult[]> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error(
          "Database connection not available for semantic tag search.",
        );
      }

      const limit = Math.min(
        Math.max(1, Number.parseInt(String(options.limit ?? 10), 10)),
        50,
      );
      const defaultCandidates = Math.max(limit * 15, 200);
      const candidates = Math.min(
        Math.max(
          limit,
          Number.parseInt(String(options.candidates ?? defaultCandidates), 10),
        ),
        1000,
      );
      const threshold = Number.parseFloat(
        String(options.threshold ?? Search.SEMANTIC_THRESHOLD),
      );

      if (!Number.isFinite(threshold) || threshold < -1.0 || threshold > 1.0) {
        throw new Error("Invalid similarity threshold provided.");
      }

      const subqueryWhere = [
        `<-owns<-(user WHERE id = $userId)`,
        `embeddings <|${candidates}, ${candidates * 2}|> $embedding`,
      ];

      const query = `
        SELECT * FROM (
          SELECT
            *,
            vector::similarity::cosine(embeddings, $embedding) AS distance
          FROM tag
          WHERE ${subqueryWhere.join(" AND ")}
        )
        WHERE distance >= ${threshold}
        ORDER BY distance DESC
        LIMIT ${limit};
      `;

      const [dbResults] = await db.query<(ITag & { distance: number })[][]>(
        query,
        {
          userId: new StringRecordId(userId),
          embedding: embedding,
        },
      );

      if (!dbResults) return [];

      return dbResults.map((tag) => ({
        id: tag.id.toString(),
        value: tag,
        score: tag.distance,
        searchType: "semantic",
      }));
    } catch (error) {
      console.error("Error during semantic tag search:", error);
      return [];
    }
  }

  static async semanticSearchTasks(
    userId: string | RecordId,
    embedding: number[],
    options: {
      limit?: number;
      threshold?: number;
      candidates?: number;
    },
  ): Promise<ITaskSearchResult[]> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error(
          "Database connection not available for semantic task search.",
        );
      }

      const limit = Math.min(
        Math.max(1, Number.parseInt(String(options.limit ?? 10), 10)),
        50,
      );
      const defaultCandidates = Math.max(limit * 15, 200);
      const candidates = Math.min(
        Math.max(
          limit,
          Number.parseInt(String(options.candidates ?? defaultCandidates), 10),
        ),
        1000,
      );
      const threshold = Number.parseFloat(
        String(options.threshold ?? Search.SEMANTIC_THRESHOLD),
      );

      if (!Number.isFinite(threshold) || threshold < -1.0 || threshold > 1.0) {
        throw new Error("Invalid similarity threshold provided.");
      }

      const subqueryWhere = [
        `<-owns<-(user WHERE id = $userId)`,
        `embeddings <|${candidates}, ${candidates * 2}|> $embedding`,
      ];

      const query = `
          SELECT * FROM (
            SELECT
              *,
              vector::similarity::cosine(embeddings, $embedding) AS distance
            FROM task
            WHERE ${subqueryWhere.join(" AND ")}
          )
          WHERE distance >= ${threshold}
          ORDER BY distance DESC
          LIMIT ${limit};
        `;

      const [dbResults] = await db.query<(ITask & { distance: number })[][]>(
        query,
        {
          userId: new StringRecordId(userId),
          embedding: embedding,
        },
      );

      if (!dbResults) return [];

      return dbResults.map((task) => ({
        id: task.id.toString(),
        value: task,
        score: task.distance,
        searchType: "semantic",
      }));
    } catch (error) {
      console.error("Error during semantic tag search:", error);
      return [];
    }
  }

  static async searchTagsByEmbedding(
    userId: string | RecordId,
    embedding: number[],
    options: {
      limit?: number;
      threshold?: number;
      candidates?: number;
    } = {},
  ): Promise<ITagSearchResult[] | undefined> {
    try {
      const semanticResults = await Search.semanticSearchTags(
        userId,
        embedding,
        {
          limit: options.limit ?? 10,
          threshold: options.threshold,
          candidates: options.candidates,
        },
      );

      return semanticResults;
    } catch (error) {
      console.error(`Error during tag search by embedding:`, error);
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

      const embeddingProcessor = getEmbedder();
      const embedding = await embeddingProcessor.embedContent(query);

      const ftsResults = await Search.ftsSearchTags(userId, query, { limit });
      let semanticResults: ITagSearchResult[] = [];

      if (embedding) {
        semanticResults = await Search.semanticSearchTags(userId, embedding, {
          limit,
          threshold: Search.SEMANTIC_THRESHOLD,
        });
      }

      const combinedResultsMap = new Map<string, ITagSearchResult>();

      for (const result of ftsResults) {
        combinedResultsMap.set(result.id.toString(), {
          ...result,
          score: result.score * 0.4,
        });
      }

      for (const result of semanticResults) {
        if (combinedResultsMap.has(result.id.toString())) {
          const existing = combinedResultsMap.get(result.id.toString())!;
          existing.score += result.score * 0.6;
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

  static async ftsSearchRabbitholes(
    userId: string,
    query: string,
    options?: { limit?: number },
  ): Promise<IRabbitholeSearchResult[]> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error(
          "Database connection not available for FTS rabbithole search.",
        );
      }
      const limit = options?.limit ?? 10;

      const dbResults = await db.run<
        (IRabbithole & {
          nameScore: number;
          preview: string;
        })[]
      >("fn::search_user_rabbitholes_fts", [
        new StringRecordId(userId),
        query,
        limit,
      ]);

      if (!dbResults) {
        throw new Error("Couldn't get results");
      }

      return dbResults.map((tag) => ({
        id: tag.id,
        value: tag,
        score: tag.nameScore,
        searchType: "fts",
      }));
    } catch (error) {
      console.error("Error during FTS tag search:", error);
      return [];
    }
  }

  /**
   * Provides search suggestions for rabbitholes using FTS.
   * @param userId The ID of the user.
   * @param query The search query string.
   * @param options Optional parameters.
   * @param options.limit The maximum number of suggestions to return (default: 5).
   * @returns A promise resolving to an array of IRabbitholeSearchResult.
   */
  static async suggestRabbitholes(
    userId: string,
    query: string,
    options?: { limit?: number },
  ): Promise<IRabbithole[]> {
    try {
      const limit = options?.limit ?? 5; // Default limit for suggestions
      const results = await Search.ftsSearchRabbitholes(userId, query, {
        limit,
      });
      return results.map((rabbithole) => {
        return rabbithole.value;
      });
    } catch (error) {
      console.error("Error during rabbithole suggestions search:", error);
      return [];
    }
  }

  static async searchTasksByEmbedding(
    userId: string | RecordId,
    embedding: number[],
    options: {
      limit?: number;
      threshold?: number;
      candidates?: number;
    } = {},
  ): Promise<ITaskSearchResult[] | undefined> {
    try {
      const semanticResults = await Search.semanticSearchTasks(
        userId,
        embedding,
        {
          limit: options.limit ?? 10,
          threshold: options.threshold,
          candidates: options.candidates,
        },
      );

      return semanticResults;
    } catch (error) {
      console.error(`Error during tag search by embedding:`, error);
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
