import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../database/db";
import { IIdea, IIdeaAsRelation, IIdeaDerived } from "../database/models/ideas";
import { getEmbedder } from "../ai/embeddings/embeddings";
import { ITag } from "../database/models/tag";
import { IRabbithole } from "../database/models/rabbithole";
import { ITask } from "../database/models/task";
import { IExcerpt } from "../database/models/excerpt";
import { IConnectable, IConnectableTypes } from "./Graph";
import { ISource } from "../database/models/source";

export type ISearchResultValue = IConnectable;

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

export type IExcerptSearchResultValue = Omit<IExcerpt, "embeddings">;

export type IExcerptSearchResult = {
  score: number;
  result: IExcerptSearchResultValue;
  search_type?: "fts" | "semantic";
};

export type IFTExcerptSResult = {
  score: number;
  id: string | RecordId;
};

export type ISemanticExcerptResult = IFTExcerptSResult;

export class Search {
  private static readonly COMPREHENSIVE_WEIGHTS = {
    SEMANTIC: 2,
    FTS_TITLE: 1.5,
    FTS_CONTENT: 0.5,
  };
  private static readonly EXACT_TITLE_BONUS = 2.0;
  private static readonly SEMANTIC_THRESHOLD = 0.45;

  constructor() {}

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
        ON TABLE task
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

    const defineExcerptVectorIndex = () => {
      return `
      DEFINE INDEX IF NOT EXISTS idx_excerpt_embeddings
        ON TABLE excerpt
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

    const excerptSearchAnalyzer = () => {
      return `
      DEFINE ANALYZER OVERWRITE excerpt_analyzer
      TOKENIZERS class
      FILTERS lowercase, snowball(english);`;
    };

    const ftsIdeaTitleSearchIndex = () => {
      return `
      DEFINE INDEX OVERWRITE idx_idea_title_fts
        ON TABLE idea
        FIELDS title
        SEARCH ANALYZER idea_analyzer
        BM25 HIGHLIGHTS;
      `;
    };

    const ftsIdeaContentSearchIndex = () => {
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
            FIELDS description
            SEARCH ANALYZER task_analyzer
            BM25 HIGHLIGHTS;
          `;
    };

    const ftsTaskScratchpadSearchIndex = () => {
      return `
          DEFINE INDEX OVERWRITE idx_task_scratchpad_fts
            ON TABLE task
            FIELDS scratchpad
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

    const ftsExcerptNoteSearchIndex = () => {
      return `
      DEFINE INDEX OVERWRITE idx_excerpt_note_fts
        ON TABLE excerpt
        FIELDS note
        SEARCH ANALYZER excerpt_analyzer
        BM25 HIGHLIGHTS;
      `;
    };

    const ftsExcerptSourceTextSearchIndex = () => {
      return `
      DEFINE INDEX OVERWRITE idx_excerpt_source_text_fts
        ON TABLE excerpt
        FIELDS sourceText
        SEARCH ANALYZER excerpt_analyzer
        BM25 HIGHLIGHTS;
      `;
    };

    const ftsSearchIdeasFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::search_user_ideas_fts(
        $userId: record<user>,
        $query: string
      ) {
        LET $ideas = SELECT
            *,
            search::highlight("->", "<-", 0) AS preview,
            search::score(0) AS contentScore,
            search::score(1) AS titleScore
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

    const ftsSearchTasksFunction = () => {
      return `
          DEFINE FUNCTION OVERWRITE fn::search_user_tasks_fts(
            $userId: record<user>,
            $query: string
          ) {
            LET $tasks = SELECT
                *,
                search::highlight("->", "<-", 0) AS preview,
                search::score(0) AS descriptionScore,
                search::score(0) AS scratchpadScore
            FROM task
            WHERE
                (description @0@ $query OR scratchpad @1@ $query)
                AND completedAt = NULL
                AND <-owns<-(user WHERE id = <record> $userId);

            return $tasks;
          }`;
    };

    const ftsSearchSourcesFunction = () => {
      return `
          DEFINE FUNCTION OVERWRITE fn::search_user_sources_fts(
            $userId: record<user>,
            $query: string
          ) {
            LET $sources = SELECT
                *,
                search::highlight("->", "<-", 0) AS preview,
                search::score(0) AS contentScore,
                search::score(1) AS titleScore
            OMIT embeddings
            FROM source
            WHERE
                (content @0@ $query OR displayName @1@ $query)
                AND <-owns<-(user WHERE id = <record> $userId);

            return $sources;
          }`;
    };

    const ftsSearchExcerptsFunction = () => {
      return `
          DEFINE FUNCTION OVERWRITE fn::search_user_excerpts_fts(
            $userId: record<user>,
            $query: string
          ) {
            LET $excerpts = SELECT
              *,
                search::highlight("->", "<-", 0) AS preview,
                search::score(0) AS noteScore,
                search::score(1) AS sourceTextScore
            OMIT embeddings
            FROM excerpt
            WHERE
                (note @0@ $query OR sourceText @1@ $query)
                AND <-owns<-(user WHERE id = <record> $userId);

            return $excerpts;
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
            search::highlight("->", "<-", 0) AS preview,
            search::score(0) AS contentScore,
            search::score(1) AS titleScore
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
            search::highlight("->", "<-", 0) AS preview,
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
            search::highlight("->", "<-", 0) AS preview,
            search::score(0) AS nameScore
        FROM rabbithole
        WHERE
            name @0@ $query
            AND <-owns<-(user WHERE id = <record> $userId)
        LIMIT $limit;

        return $rabbitholes;
      }`;
    };

    try {
      const db = await getDatabase();
      if (!db) throw new Error("Database not initialized for Search.up");

      // ** Ideas **
      await db.query(ideaSearchAnalyzer());
      await db.query(ftsIdeaTitleSearchIndex());
      await db.query(ftsIdeaContentSearchIndex());
      await db.query(defineVectorIndex());
      await db.query(ftsSearchIdeasFunction());

      // ** Tasks **
      await db.query(taskSearchAnalyzer());
      await db.query(defineTaskVectorIndex());
      await db.query(ftsTaskDescriptionSearchIndex());
      await db.query(ftsTaskScratchpadSearchIndex());
      await db.query(ftsSearchTasksFunction());

      // ** Excerpts **
      await db.query(excerptSearchAnalyzer());
      await db.query(defineExcerptVectorIndex());
      await db.query(ftsExcerptNoteSearchIndex());
      await db.query(ftsExcerptSourceTextSearchIndex());
      await db.query(ftsSearchExcerptsFunction());

      // ** Sources **
      await db.query(sourceSearchAnalyzer());
      await db.query(defineSourceVectorIndex());
      await db.query(ftsSourceDisplayNameSearchIndex());
      await db.query(ftsSourceContentSearchIndex());
      await db.query(ftsSearchSourcesFunction());

      // ** Tags **
      await db.query(tagSearchAnalyzer());
      await db.query(ftsTagNameSearchIndex());
      await db.query(ftsTagDescriptionSearchIndex());
      await db.query(defineTagVectorIndex());
      await db.query(ftsSearchTagsFunction());

      // ** Rabbitholes **
      await db.query(rabbitholeSearchAnalyzer());
      await db.query(ftsRabbitholeSearchIndex());
      await db.query(defineRabbitholeVectorIndex());
      await db.query(ftsSearchRabbitholesFunction());
      await db.query(ftsSearchWithinRabbitholeFunction());
    } catch (error) {
      console.error("Error during Search.up():", error);
      throw error;
    }
  }

  static async down() {
    // Implementation for removing indexes can be added here
  }

  // =================================================================
  // FTS Search Methods
  // =================================================================

  public static async ftsSearchIdeas(
    userId: string | RecordId,
    query: string,
    options?: { rabbitholeId?: string },
  ): Promise<ISearchResult[]> {
    const db = await getDatabase();
    if (!db) throw new Error("Database not initialized");

    const fn = options?.rabbitholeId
      ? "fn::search_rabbithole_ideas_fts"
      : "fn::search_user_ideas_fts";
    const args = options?.rabbitholeId
      ? [query, options.rabbitholeId]
      : [new StringRecordId(userId), query];

    const results = await db.run<IFTSIdeaResult[]>(fn, args);
    if (!results) return [];

    return results.map(
      (idea): ISearchResult => ({
        id: idea.id,
        score: (idea.titleScore ?? 0) + (idea.contentScore ?? 0),
        value: { ...idea, type: "idea" },
        highlightText: idea.preview,
        debug: {
          ftsContentScore: idea.contentScore,
          ftsTitleScore: idea.titleScore,
          source: "fts",
        },
      }),
    );
  }

  public static async ftsSearchSources(
    userId: string | RecordId,
    query: string,
  ): Promise<ISearchResult[]> {
    const db = await getDatabase();
    if (!db) throw new Error("Database not initialized");

    const results = await db.run<
      (ISource & {
        contentScore: number;
        titleScore: number;
        preview: string;
      })[]
    >("fn::search_user_sources_fts", [new StringRecordId(userId), query]);
    if (!results) return [];

    return results.map(
      (source): ISearchResult => ({
        id: source.id,
        score: (source.titleScore ?? 0) + (source.contentScore ?? 0),
        value: { ...source, type: "source" },
        highlightText: source.preview,
        debug: {
          ftsContentScore: source.contentScore,
          ftsTitleScore: source.titleScore,
          source: "fts",
        },
      }),
    );
  }

  public static async ftsSearchExcerpts(
    userId: string | RecordId,
    query: string,
  ): Promise<ISearchResult[]> {
    const db = await getDatabase();
    if (!db) throw new Error("Database not initialized");

    const results = await db.run<
      (IExcerpt & {
        noteScore: number;
        sourceTextScore: number;
        preview: string;
      })[]
    >("fn::search_user_excerpts_fts", [new StringRecordId(userId), query]);
    if (!results) return [];

    return results.map(
      (excerpt): ISearchResult => ({
        id: excerpt.id,
        score: (excerpt.noteScore ?? 0) + (excerpt.sourceTextScore ?? 0),
        value: { ...excerpt, type: "excerpt" },
        highlightText: excerpt.preview,
        debug: {
          ftsContentScore: excerpt.noteScore,
          ftsTitleScore: excerpt.sourceTextScore,
          source: "fts",
        },
      }),
    );
  }

  public static async ftsSearchTasks(
    userId: string | RecordId,
    query: string,
  ): Promise<ISearchResult[]> {
    const db = await getDatabase();
    if (!db) throw new Error("Database not initialized");

    const results = await db.run<
      (ITask & { titleScore: number; preview: string })[]
    >("fn::search_user_tasks_fts", [new StringRecordId(userId), query]);

    if (!results) return [];

    return results.map(
      (task): ISearchResult => ({
        id: task.id,
        score: task.titleScore ?? 0,
        value: { ...task, type: "task" },
        highlightText: task.preview,
        debug: {
          ftsTitleScore: task.titleScore,
          source: "fts",
        },
      }),
    );
  }

  // =================================================================
  // Semantic Search Methods
  // =================================================================

  private static async semanticSearchIdeas(
    userId: string | RecordId,
    embedding: number[],
    options: {
      limit?: number;
      threshold?: number;
      candidates?: number;
      rabbitholeId?: string;
    },
  ): Promise<ISearchResult[]> {
    const db = await getDatabase();
    if (!db) throw new Error("Database not initialized");

    const limit = options.limit ?? 100;
    const candidates = options.candidates ?? 300;
    const threshold = options.threshold ?? this.SEMANTIC_THRESHOLD;

    const subqueryWhere = [`<-owns<-(user WHERE id = $userId)`];
    if (options.rabbitholeId) {
      subqueryWhere.push(
        `(id IN (SELECT VALUE ->includes.out FROM ONLY <record>$rabbitholeId) OR id IN (SELECT VALUE ->includes->tag->describes.out FROM ONLY <record>$rabbitholeId))`,
      );
    } else {
      subqueryWhere.push(`embeddings <|${limit}, ${candidates}|> $embedding`);
    }

    const query = `
      SELECT * FROM (
        SELECT *, vector::similarity::cosine(embeddings, $embedding) AS distance
        OMIT embeddings FROM idea WHERE ${subqueryWhere.join(" AND ")}
      )
      WHERE distance >= ${threshold} ORDER BY distance DESC LIMIT ${limit};`;

    const [results] = await db.query<(IIdea & { distance: number })[][]>(
      query,
      {
        userId: new StringRecordId(userId),
        embedding: embedding,
        ...(options.rabbitholeId && {
          rabbitholeId: new StringRecordId(options.rabbitholeId),
        }),
      },
    );
    if (!results) return [];

    return results.map(
      (idea): ISearchResult => ({
        id: idea.id,
        score: idea.distance ?? 0,
        value: { ...idea, type: "idea" },
        highlightText: idea.contentPlain?.substring(0, 150),
        debug: { semanticScore: idea.distance, source: "semantic" },
      }),
    );
  }

  private static async semanticSearchSources(
    userId: string | RecordId,
    embedding: number[],
    options: { limit?: number; threshold?: number; candidates?: number },
  ): Promise<ISearchResult[]> {
    const db = await getDatabase();
    if (!db) throw new Error("Database not initialized");

    const limit = options.limit ?? 100;
    const candidates = options.candidates ?? 300;
    const threshold = options.threshold ?? this.SEMANTIC_THRESHOLD;

    const query = `
      SELECT * FROM (
        SELECT *, vector::similarity::cosine(embeddings, $embedding) AS distance
        OMIT embeddings FROM source
        WHERE <-owns<-(user WHERE id = $userId) AND embeddings <|${limit}, ${candidates}|> $embedding
      )
      WHERE distance >= ${threshold} ORDER BY distance DESC LIMIT ${limit};`;

    const [results] = await db.query<(ISource & { distance: number })[][]>(
      query,
      { userId: new StringRecordId(userId), embedding: embedding },
    );
    if (!results) return [];

    return results.map(
      (source): ISearchResult => ({
        id: source.id,
        score: source.distance ?? 0,
        value: { ...source, type: "source" },
        highlightText: source.content?.substring(0, 150),
        debug: { semanticScore: source.distance, source: "semantic" },
      }),
    );
  }

  private static async semanticSearchTasks(
    userId: string | RecordId,
    embedding: number[],
    options: { limit?: number; threshold?: number; candidates?: number },
  ): Promise<ISearchResult[]> {
    const db = await getDatabase();
    if (!db) throw new Error("Database not initialized");

    const limit = options.limit ?? 100;
    const candidates = options.candidates ?? 300;
    const threshold = options.threshold ?? this.SEMANTIC_THRESHOLD;

    const query = `
      SELECT * FROM (
        SELECT *, vector::similarity::cosine(embeddings, $embedding) AS distance
        OMIT embeddings FROM task
        WHERE <-owns<-(user WHERE id = $userId) AND completedAt = NULL AND embeddings <|${limit}, ${candidates}|> $embedding
      )
      WHERE distance >= ${threshold} ORDER BY distance DESC LIMIT ${limit};`;

    const [results] = await db.query<(ITask & { distance: number })[][]>(
      query,
      {
        userId: new StringRecordId(userId),
        embedding: embedding,
      },
    );
    if (!results) return [];

    return results.map(
      (task): ISearchResult => ({
        id: task.id,
        score: task.distance ?? 0,
        value: { ...task, type: "task" },
        highlightText: task.description.substring(0, 150),
        debug: { semanticScore: task.distance, source: "semantic" },
      }),
    );
  }

  private static async semanticSearchExcerpts(
    userId: string | RecordId,
    embedding: number[],
    options: { limit?: number; threshold?: number; candidates?: number },
  ): Promise<ISearchResult[]> {
    const db = await getDatabase();
    if (!db) throw new Error("Database not initialized");

    const limit = options.limit ?? 100;
    const candidates = options.candidates ?? 300;
    const threshold = options.threshold ?? this.SEMANTIC_THRESHOLD;

    const query = `
      SELECT * FROM (
        SELECT *, vector::similarity::cosine(embeddings, $embedding) AS distance
        OMIT embeddings FROM excerpt
        WHERE <-owns<-(user WHERE id = $userId) AND embeddings <|${limit}, ${candidates}|> $embedding
      )
      WHERE distance >= ${threshold} ORDER BY distance DESC LIMIT ${limit};`;

    const [results] = await db.query<(IExcerpt & { distance: number })[][]>(
      query,
      {
        userId: new StringRecordId(userId),
        embedding: embedding,
      },
    );
    if (!results) return [];

    return results.map(
      (excerpt): ISearchResult => ({
        id: excerpt.id,
        score: excerpt.distance ?? 0,
        value: { ...excerpt, type: "excerpt" },
        highlightText: excerpt.note.substring(0, 150),
        debug: { semanticScore: excerpt.distance, source: "semantic" },
      }),
    );
  }

  // =================================================================
  // Comprehensive (Hybrid) Search
  // =================================================================

  private static _mergeAndScore(
    ftsResults: ISearchResult[],
    semanticResults: ISearchResult[],
    queryLower: string,
    type: IConnectableTypes,
  ): ISearchResult[] {
    const combinedResults: Map<string, ISearchResult> = new Map();

    for (const ftsRes of ftsResults) {
      const id = ftsRes.id.toString();
      const node = ftsRes.value;

      let score =
        (ftsRes.debug?.ftsTitleScore ?? 0) *
          this.COMPREHENSIVE_WEIGHTS.FTS_TITLE +
        (ftsRes.debug?.ftsContentScore ?? 0) *
          this.COMPREHENSIVE_WEIGHTS.FTS_CONTENT;

      const title =
        type === "idea"
          ? (node as IIdea).title
          : type === "source"
            ? (node as ISource).displayName
            : (node as ITask).description;
      const exactTitleBonus =
        title?.toLowerCase().trim() === queryLower ? this.EXACT_TITLE_BONUS : 0;
      score += exactTitleBonus;

      combinedResults.set(id, {
        ...ftsRes,
        score: score,
        debug: {
          ...ftsRes.debug,
          exactTitleBonus: exactTitleBonus,
          source: "hybrid",
        },
      });
    }

    for (const semRes of semanticResults) {
      const id = semRes.id.toString();
      const semanticScore = semRes.debug?.semanticScore ?? 0;

      if (semanticScore >= this.SEMANTIC_THRESHOLD) {
        const existing = combinedResults.get(id);
        const semanticContribution =
          semanticScore * this.COMPREHENSIVE_WEIGHTS.SEMANTIC;

        if (existing) {
          existing.score += semanticContribution;
          existing.debug = {
            ...existing.debug,
            semanticScore: semanticScore,
            source: "hybrid",
          };
        } else {
          combinedResults.set(id, {
            ...semRes,
            score: semanticContribution,
            debug: { ...semRes.debug, source: "hybrid" },
          });
        }
      }
    }

    return Array.from(combinedResults.values());
  }

  static async comprehensiveSearch(
    userId: string | RecordId,
    query: string,
    options: { limit?: number; rabbitholeId?: string } = {},
  ): Promise<ISearchResult[]> {
    const limit = options.limit ?? 50;
    const queryLower = String(query).toLowerCase().trim();

    try {
      const embeddingProcessor = getEmbedder();
      const queryEmbedding = await embeddingProcessor
        .embedContent(query)
        .catch(() => null);

      const [ideaResults, sourceResults, taskResults, excerptResults] =
        await Promise.all([
          // Ideas
          (async () => {
            const fts = await this.ftsSearchIdeas(userId, query, options);
            const semantic = queryEmbedding
              ? await this.semanticSearchIdeas(userId, queryEmbedding, options)
              : [];
            return this._mergeAndScore(fts, semantic, queryLower, "idea");
          })(),
          // Sources
          (async () => {
            const fts = await this.ftsSearchSources(userId, query);
            const semantic = queryEmbedding
              ? await this.semanticSearchSources(
                  userId,
                  queryEmbedding,
                  options,
                )
              : [];
            return this._mergeAndScore(fts, semantic, queryLower, "source");
          })(),
          // Tasks
          (async () => {
            const fts = await this.ftsSearchTasks(userId, query);
            const semantic = queryEmbedding
              ? await this.semanticSearchTasks(userId, queryEmbedding, options)
              : [];
            return this._mergeAndScore(fts, semantic, queryLower, "task");
          })(),
          (async () => {
            const fts = await this.ftsSearchExcerpts(userId, query);
            const semantic = queryEmbedding
              ? await this.semanticSearchExcerpts(
                  userId,
                  queryEmbedding,
                  options,
                )
              : [];
            return this._mergeAndScore(fts, semantic, queryLower, "task");
          })(),
        ]);

      const allResults = [
        ...ideaResults,
        ...sourceResults,
        ...taskResults,
        ...excerptResults,
      ];
      allResults.sort((a, b) => b.score - a.score);

      return allResults.slice(0, limit);
    } catch (error) {
      console.error(
        `Error during comprehensive search for query "${query}":`,
        error,
      );
      return [];
    }
  }

  static async searchByEmbedding(
    userId: string | RecordId,
    embedding: number[],
    options: { limit?: number; threshold?: number; candidates?: number } = {},
  ): Promise<ISearchResult[]> {
    try {
      const [ideaResults, sourceResults, taskResults, excerptResults] =
        await Promise.all([
          this.semanticSearchIdeas(userId, embedding, options),
          this.semanticSearchSources(userId, embedding, options),
          this.semanticSearchTasks(userId, embedding, options),
          this.semanticSearchExcerpts(userId, embedding, options),
        ]);

      const allResults = [
        ...ideaResults,
        ...sourceResults,
        ...taskResults,
        ...excerptResults,
      ];
      allResults.sort((a, b) => b.score - a.score);

      return allResults.slice(0, options.limit ?? 50);
    } catch (error) {
      console.error(`Error during search by embedding:`, error);
      return [];
    }
  }

  static async suggest(
    userId: string,
    query: string,
    options?: { limit?: number; rabbitholeId?: string },
  ): Promise<ISearchResultValue[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }
    try {
      const limit = options?.limit ?? 15;

      const [ideaResults, sourceResults, taskResults, excerptResults] =
        await Promise.all([
          this.ftsSearchIdeas(userId, query, options),
          this.ftsSearchSources(userId, query),
          this.ftsSearchTasks(userId, query),
          this.ftsSearchExcerpts(userId, query),
        ]);

      const allResults = [
        ...ideaResults,
        ...sourceResults,
        ...taskResults,
        ...excerptResults,
      ];
      allResults.sort((a, b) => b.score - a.score);

      return allResults.slice(0, limit).map((result) => {
        return result.value;
      });
    } catch (error) {
      console.error("Error during suggest:", error);
      return [];
    }
  }

  static async smartSuggest(
    userId: string,
    query: string,
    options?: { limit?: number; rabbitholeId?: string },
  ): Promise<ISearchResultValue[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }
    try {
      const limit = options?.limit ?? 15;

      const results = await this.comprehensiveSearch(userId, query, options);

      return results.slice(0, limit).map((result) => {
        return result.value;
      });
    } catch (error) {
      console.error("Error during suggest:", error);
      return [];
    }
  }

  // =================================================================
  // Non-Connectable Specific Search Methods (Tags, etc.)
  // =================================================================

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
}

export const initSearch = async () => {
  await Search.up();
};

export const dropSearch = async () => {
  await Search.down();
};
