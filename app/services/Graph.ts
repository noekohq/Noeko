import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../database/db";
import { Idea, IIdea, ISafeIdea } from "../database/models/ideas";
import Source, { ISource } from "../database/models/source";
import Task, { IPublicTask, ITask } from "../database/models/task";
import Excerpt, {
  IExcerpt,
  IVirtualExcerptReference,
} from "../database/models/excerpt";
import { ITag, ITagDescriptionRelationship, Tag } from "../database/models/tag";
import Rabbithole, {
  IRabbithole,
  IRabbitholeInclusion,
} from "../database/models/rabbithole";
import { Search } from "./Search";
import { averageEmbeddings, weightedAverage } from "../utils/math";
import { getEmbedder } from "../ai/embeddings/embeddings";

export type IConnectableTypes = "idea" | "source" | "task" | "excerpt";

export type IConnectable =
  | ((ISafeIdea | IIdea) & {
      type: "idea";
      direction?: "incoming" | "outgoing";
    })
  | ((ITask | IPublicTask) & {
      type: "task";
      direction?: "incoming" | "outgoing";
    })
  | (ISource & { type: "source"; direction?: "incoming" | "outgoing" })
  | (IExcerpt & { type: "excerpt"; direction?: "incoming" | "outgoing" });

export type IConnectableTypeMap = {
  idea: IIdea;
  source: ISource;
  task: ITask | IPublicTask;
  excerpt: IExcerpt;
};

export type ISimilarConnectable = IConnectable & { similarity: number };

export type IConnection = {
  id: string | RecordId;
  in: string | RecordId;
  out: string | RecordId;
};

export type IGraphFilters = Partial<{
  rabbithole: string;
  date: {
    createdAt?: {
      after: string;
      before: string;
    };
    updatedAt?: {
      after: string;
      before: string;
    };
    viewedAt?: {
      after: string;
      before: string;
    };
  };
}>;

export default class GraphService {
  static readonly SUGGESTION_WEIGHT = 0.5;

  constructor() {}

  public static async up() {
    const db = await getDatabase();
    if (!db) {
      throw new Error("Couldn't get database");
    }

    const getSourceConnectionsFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::get_source_connections(
        $sourceId: record
      ) {
        LET $connections = SELECT
            ->connected->(?) as outgoing,
            <-connected<-(?) as incoming
          FROM ONLY $sourceId
          FETCH outgoing, incoming;
        RETURN $connections;
      }
      `;
    };

    const getSourceUserConnectionsFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::get_source_user_connections(
        $sourceId: record,
        $userId: record<user>
      ) {
        LET $connections = SELECT
            -- OUTGOING connections (The nodes we point TO)
            ->connected->(
              ? WHERE
                -- 1. User owns the target node
                (count(<-owns[WHERE in = $userId]) > 0)
                OR
                -- 2. Target node is shared with the user
                (count(->shared_with[WHERE out = $userId]) > 0)
            ) as outgoing,

            -- INCOMING connections (The nodes pointing TO us)
            <-connected<-(
              ? WHERE
                -- 1. User owns the source node
                (count(<-owns[WHERE in = $userId]) > 0)
                OR
                -- 2. Source node is shared with the user
                (count(->shared_with[WHERE out = $userId]) > 0)
            ) as incoming

          FROM ONLY $sourceId
          FETCH outgoing, incoming;

        RETURN $connections;
      }
          `;
    };

    function connectedIndex() {
      return `
      DEFINE INDEX IF NOT EXISTS idx_connections_in
        ON TABLE connected
        FIELDS in;
      DEFINE INDEX IF NOT EXISTS idx_connections_out
        ON TABLE connected
        FIELDS out;
    `;
    }

    await db.query(getSourceConnectionsFunction());
    await db.query(getSourceUserConnectionsFunction());
    await db.query(connectedIndex());

    function edgeIndexes() {
      return `
      DEFINE INDEX IF NOT EXISTS idx_describes_in ON TABLE describes FIELDS in;
      DEFINE INDEX IF NOT EXISTS idx_describes_out ON TABLE describes FIELDS out;
      DEFINE INDEX IF NOT EXISTS idx_includes_in ON TABLE includes FIELDS in;
      DEFINE INDEX IF NOT EXISTS idx_includes_out ON TABLE includes FIELDS out;
    `;
    }

    await db.query(edgeIndexes());
  }

  private static _connectionTypes = {
    idea: { outgoing: "connected", incoming: "connected" },
    source: { outgoing: "connected", incoming: "connected" },
    task: { outgoing: "connected", incoming: "connected" },
    excerpt: { outgoing: "connected", incoming: "connected" },
  };

  static get connectionTypes() {
    return this._connectionTypes;
  }

  public static getTable(thingId: string | RecordId) {
    const table = thingId.toString().split(":")[0];
    if (!table) {
      return undefined;
    }
    return table;
  }

  public static isConnectable(thingId: string | RecordId) {
    const table = this.getTable(thingId);
    if (!table) {
      return undefined;
    }
    if (!(table in this.connectionTypes)) {
      return false;
    }
    return true;
  }

  public static isTag(thingId: string | RecordId) {
    const table = this.getTable(thingId);
    if (!table) {
      return undefined;
    }
    if (table === "tag") {
      return true;
    }
    return false;
  }

  public static isRabbithole(thingId: string | RecordId) {
    const table = this.getTable(thingId);
    if (!table) {
      return undefined;
    }
    if (table === "rabbithole") {
      return true;
    }
    return false;
  }

  public static async connect(
    source: string | RecordId,
    target: string | RecordId,
  ): Promise<IConnection | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }

      const [existingConnections] = await db.query<[IConnection[]]>(
        `SELECT * FROM connected WHERE in = $sourceId AND out = $targetId LIMIT 1`,
        {
          sourceId: new StringRecordId(source),
          targetId: new StringRecordId(target),
        },
      );

      if (existingConnections && existingConnections.length > 0) {
        return existingConnections[0];
      }

      const canConnectSource = this.isConnectable(source);
      const canConnectTarget = this.isConnectable(target);
      if (!canConnectSource) {
        throw new Error("Can't connect source");
      }
      if (!canConnectTarget) {
        throw new Error("Can't connect target");
      }
      const [newConnections] = await db.query<[IConnection[]]>(
        `RELATE $sourceId->connected->$targetId CONTENT { createdAt: $now, }`,
        {
          sourceId: new StringRecordId(source),
          targetId: new StringRecordId(target),
          now: new Date(),
        },
      );
      if (!newConnections || newConnections.length === 0) {
        console.error("No link created.");
        return undefined;
      }

      return newConnections[0];
    } catch (error) {
      console.error(
        "Error connecting source to target: ",
        source,
        target,
        error,
      );
      return undefined;
    }
  }

  static async disconnect(
    source: string | RecordId,
    target: string | RecordId,
  ) {
    try {
      const db = await getDatabase();
      const result = await db?.query<IConnection[]>(
        "DELETE FROM (SELECT VALUE <->connected FROM ONLY <record> $source) WHERE out = <record> $target OR in = <record> $target;",
        {
          source: new StringRecordId(source),
          target: new StringRecordId(target),
        },
      );
      if (!result) {
        console.error("No connection deleted.");
        return undefined;
      }
      const [connection] = result;
      return connection;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async getConnections(
    thingId: string | RecordId,
  ): Promise<IConnectable[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get database");
      }
      const result = await db.run<{
        outgoing: IConnectable[];
        incoming: IConnectable[];
      }>(`fn::get_source_connections`, [new StringRecordId(thingId)]);
      if (!result) {
        throw new Error("Couldn't get source connections");
      }
      const { incoming: i, outgoing: o } = result;
      const incoming: IConnectable[] = i
        .map((node) => {
          const connectable = this.getConnectable(node);
          return connectable;
        })
        .filter((n) => !!n);
      const outgoing: IConnectable[] = o
        .map((node) => {
          const connectable = this.getConnectable(node);
          return connectable;
        })
        .filter((n) => !!n);

      const combined = [...incoming, ...outgoing];
      return combined;
    } catch (error) {
      console.error("Couldn't get connections: ", thingId, error);
      return undefined;
    }
  }

  static async getUserConnectionsForThing(
    thingId: string | RecordId,
    userId: string | RecordId,
  ): Promise<IConnectable[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get database");
      }
      const result = await db.run<{
        outgoing: IConnectable[];
        incoming: IConnectable[];
      }>(`fn::get_source_user_connections`, [
        new StringRecordId(thingId),
        new StringRecordId(userId),
      ]);
      if (!result) {
        throw new Error("Couldn't get source connections");
      }
      const { incoming: i, outgoing: o } = result;
      const incoming: IConnectable[] = i
        .map((node) => {
          const connectable = this.getConnectable(node);
          return connectable;
        })
        .filter((n) => !!n);
      const outgoing: IConnectable[] = o
        .map((node) => {
          const connectable = this.getConnectable(node);
          return connectable;
        })
        .filter((n) => !!n);

      const combined = [...incoming, ...outgoing];
      return combined;
    } catch (error) {
      console.error("Couldn't get connections: ", thingId, error);
      return undefined;
    }
  }

  static async getTags(
    thingId: string | RecordId,
  ): Promise<ITag[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get the database");
      }

      const results = await db.query<[ITag[]]>(
        `
        SELECT VALUE
          <-describes<-tag as tags
        FROM ONLY $thingId
        FETCH tags;
        `,
        {
          thingId: new StringRecordId(thingId),
        },
      );
      if (!results || !results[0]) {
        throw new Error("Tags were not returned from the database");
      }
      const [rawTags] = results;
      const filtered = rawTags.map((t) => {
        const { embeddings, ...tag } = t;
        return tag;
      });
      return filtered as ITag[];
    } catch (error) {
      console.error("Couldn't get tags: ", error);
      return undefined;
    }
  }

  static async getUserTagsForThing(
    thingId: string | RecordId,
    userId: string | RecordId,
  ): Promise<ITag[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get the database");
      }

      const results = await db.query<[ITag[]]>(
        `
          SELECT VALUE (
              SELECT * OMIT cachedCentroidEmbeddings, embeddings
              FROM <-describes<-(
                  tag WHERE
                  (count(<-owns[WHERE in = $userId]) > 0)
                  OR
                  (count(->shared_with[WHERE out = $userId]) > 0)
              )
          )
          FROM ONLY $thingId;
          `,
        {
          thingId: new StringRecordId(thingId),
          userId: new StringRecordId(userId),
        },
      );

      if (!results || !results[0]) {
        // Return empty array if no tags found (or query fail)
        return [];
      }

      const [rawTags] = results;

      const filtered = rawTags.map((t) => {
        // Omit embeddings from the response payload for performance
        const { embeddings, ...tag } = t;
        return tag;
      });

      return filtered as ITag[];
    } catch (error) {
      console.error("Couldn't get tags: ", error);
      return undefined;
    }
  }

  static async getSuggestedTags(
    userId: string | RecordId,
    thingId: string | RecordId,
  ): Promise<ITag[] | undefined> {
    try {
      if (!this.isConnectable(thingId)) {
        throw new Error("Can't get suggested tags for non-connectable");
      }

      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get the database");
      }

      const embeddingVector = await this.getConnectableEmbedding(thingId);

      const applied = await this.getTags(thingId);
      const appliedIds = applied?.map((a) => a.id.toString()) || [];

      if (!embeddingVector) {
        throw new Error("No embedding vector");
      }

      const threshold = 0.4;
      const limit = 10;

      const subqueryWhere = [
        `<-owns<-(user WHERE id = $userId)`,
        `embeddings <|30, 300|> $embedding`,
        `id NOT in [${appliedIds.join(", ")}]`,
      ];

      const query = `
        SELECT * FROM (
          SELECT
            *,
            vector::similarity::cosine(embeddings, $embedding) AS distance
          OMIT embeddings
          FROM tag
          WHERE ${subqueryWhere.join(" AND ")}
        )
        WHERE
          distance >= ${threshold}
        ORDER BY distance DESC
        LIMIT ${limit};
      `;

      const [dbResults] = await db.query<(ITag & { distance: number })[][]>(
        query,
        {
          userId: new StringRecordId(userId),
          connectableId: new StringRecordId(thingId),
          embedding: embeddingVector,
        },
      );

      if (!dbResults) {
        throw new Error("Didn't find any suggestions");
      }

      return dbResults;
    } catch (error) {
      console.error("Couldn't get suggested tags: ", error);
      return undefined;
    }
  }

  static getConnectable(connectable: IConnectable) {
    if (connectable.id.toString().startsWith("idea")) {
      return {
        ...(connectable as IIdea),
        type: "idea" as const,
        direction: "incoming" as const,
      };
    }
    if (connectable.id.toString().startsWith("source")) {
      return {
        ...(connectable as ISource),
        type: "source" as const,
        direction: "incoming" as const,
      };
    }
    if (connectable.id.toString().startsWith("task")) {
      return {
        ...(connectable as ITask),
        type: "task" as const,
        direction: "incoming" as const,
      };
    }
    if (connectable.id.toString().startsWith("excerpt")) {
      return {
        ...(connectable as IExcerpt),
        type: "excerpt" as const,
        direction: "incoming" as const,
      };
    }
  }

  static async getSimilarConnectables(
    userId: string | RecordId,
    thingId: string | RecordId,
    options: {
      limit?: number;
      threshold?: number;
      candidates?: number;
      rabbitholeId?: string;
    },
  ): Promise<IConnectable[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Database not initialized");

      const limit =
        options.limit && isFinite(options.limit) ? Number(options.limit) : 10;
      const defaultCandidates = 300;
      const candidates = Number(options.candidates ?? defaultCandidates);

      const embedding = await this.getConnectableEmbedding(thingId);
      if (!embedding) {
        throw new Error("Couldn't get embedding vector for connectable");
      }

      const threshold = Number.parseFloat(String(options.threshold ?? 0.45));
      if (!Number.isFinite(threshold) || threshold < -1.0 || threshold > 1.0) {
        throw new Error("Invalid similarity threshold provided.");
      }

      const subqueryWhere = [
        `<-owns<-(user WHERE id = $userId)`,
        `id != $sourceId`,
        `id NOT IN <->connected->(?)`,
      ];

      subqueryWhere.push(`embeddings <|${limit}, ${candidates}|> $embedding`);

      if (options.rabbitholeId) {
        subqueryWhere.push(`
            (
              id IN (SELECT VALUE ->includes.out FROM ONLY <record>$rabbitholeId) OR
              id IN (SELECT VALUE ->includes->tag->describes.out FROM ONLY <record>$rabbitholeId)
            )
          `);
      }

      const tableQuery = (table: string) => {
        const tableWhere: string[] = [];
        if (table === "task") {
          tableWhere.push(`completedAt = NULL`);
        }
        if (table === "excerpt") {
          tableWhere.push(`references != $sourceId`);
        }
        const query = `
          SELECT * FROM (
            SELECT
              *,
              vector::similarity::cosine(embeddings, $embedding) AS similarity
            OMIT embeddings
            FROM ${table}
            WHERE ${[...subqueryWhere, ...tableWhere].join(" AND ")}
          )
          WHERE
            similarity >= ${threshold} AND
            similarity != NaN
          ORDER BY similarity DESC
          LIMIT ${limit};
          `;
        return query;
      };

      const ideaQuery = tableQuery("idea");
      const sourceQuery = tableQuery("source");
      const taskQuery = tableQuery("task");
      const excerptQuery = tableQuery("excerpt");

      const getOfType = async <T extends ISimilarConnectable>(
        query: string,
      ): Promise<ISimilarConnectable[]> => {
        const [results] = await db.query<[T[]]>(query, {
          userId: new StringRecordId(userId),
          embedding: embedding,
          ...(options.rabbitholeId && {
            rabbitholeId: new StringRecordId(options.rabbitholeId),
          }),
          sourceId: new StringRecordId(thingId),
        });
        return results;
      };

      const ideas = (
        await getOfType<IIdea & { type: "idea"; similarity: number }>(ideaQuery)
      ).map((i) => ({ ...i, type: "idea" as const }));
      const sources = (
        await getOfType<ISource & { type: "source"; similarity: number }>(
          sourceQuery,
        )
      ).map((s) => ({
        ...s,
        type: "source" as const,
      }));
      const tasks = (
        await getOfType<ITask & { type: "task"; similarity: number }>(taskQuery)
      ).map((t) => ({
        ...t,
        type: "task" as const,
      }));
      const excerpts = (
        await getOfType<IExcerpt & { type: "excerpt"; similarity: number }>(
          excerptQuery,
        )
      ).map((t) => ({
        ...t,
        type: "excerpt" as const,
      }));

      const combined = [...ideas, ...sources, ...tasks, ...excerpts];
      const sorted = combined.sort((a, b) => {
        if (a.similarity > b.similarity) {
          return -1;
        }
        if (a.similarity === b.similarity) {
          return 0;
        }
        return 1;
      });

      const final = sorted;

      return final as IConnectable[];
    } catch (error) {
      console.error("Error during semantic search:", error);
      return undefined;
    }
  }

  static async getRecommendedConnectables(
    userId: string | RecordId,
    thingId: string | RecordId,
    options: {
      limit?: number;
      threshold?: number;
      candidates?: number;
      rabbitholeId?: string;
    },
  ): Promise<IConnectable[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Database not initialized");

      const limit =
        options.limit && isFinite(options.limit) ? Number(options.limit) : 10;
      const defaultCandidates = 300;
      const candidates = Number(options.candidates ?? defaultCandidates);

      const connectableEmbedding = await this.getConnectableEmbedding(thingId);
      if (!connectableEmbedding) {
        throw new Error("Couldn't get connectable vector for connectable");
      }

      const centroidEmbedding =
        await this.getConnectableCentroidEmbedding(thingId);

      const embedding = await this.getWeightedVector(
        connectableEmbedding || null,
        centroidEmbedding || null,
      );

      const threshold = Number.parseFloat(String(options.threshold ?? 0.45));
      if (!Number.isFinite(threshold) || threshold < -1.0 || threshold > 1.0) {
        throw new Error("Invalid similarity threshold provided.");
      }

      const subqueryWhere = [
        `<-owns<-(user WHERE id = $userId)`,
        `id != $sourceId`,
        `id NOT IN <->connected->(?)`,
      ];

      subqueryWhere.push(`embeddings <|${limit}, ${candidates}|> $embedding`);

      if (options.rabbitholeId) {
        subqueryWhere.push(`
              (
                id IN (SELECT VALUE ->includes.out FROM ONLY <record>$rabbitholeId) OR
                id IN (SELECT VALUE ->includes->tag->describes.out FROM ONLY <record>$rabbitholeId)
              )
            `);
      }

      const tableQuery = (table: string) => {
        const tableWhere: string[] = [];
        if (table === "task") {
          tableWhere.push(`completedAt = NULL`);
        }
        if (table === "excerpt") {
          tableWhere.push(`references != $sourceId`);
        }
        const query = `
            SELECT * FROM (
              SELECT
                *,
                vector::similarity::cosine(embeddings, $embedding) AS similarity
              OMIT embeddings
              FROM ${table}
              WHERE ${[...subqueryWhere, ...tableWhere].join(" AND ")}
            )
            WHERE
              similarity >= ${threshold} AND
              similarity != NaN
            ORDER BY similarity DESC
            LIMIT ${limit};
            `;
        return query;
      };

      const ideaQuery = tableQuery("idea");
      const sourceQuery = tableQuery("source");
      const taskQuery = tableQuery("task");
      const excerptQuery = tableQuery("excerpt");

      const getOfType = async <T extends ISimilarConnectable>(
        query: string,
      ): Promise<ISimilarConnectable[]> => {
        const [results] = await db.query<[T[]]>(query, {
          userId: new StringRecordId(userId),
          embedding: embedding,
          ...(options.rabbitholeId && {
            rabbitholeId: new StringRecordId(options.rabbitholeId),
          }),
          sourceId: new StringRecordId(thingId),
        });
        return results;
      };

      const ideas = (
        await getOfType<IIdea & { type: "idea"; similarity: number }>(ideaQuery)
      ).map((i) => ({ ...i, type: "idea" as const }));
      const sources = (
        await getOfType<ISource & { type: "source"; similarity: number }>(
          sourceQuery,
        )
      ).map((s) => ({
        ...s,
        type: "source" as const,
      }));
      const tasks = (
        await getOfType<ITask & { type: "task"; similarity: number }>(taskQuery)
      ).map((t) => ({
        ...t,
        type: "task" as const,
      }));
      const excerpts = (
        await getOfType<IExcerpt & { type: "excerpt"; similarity: number }>(
          excerptQuery,
        )
      ).map((t) => ({
        ...t,
        type: "excerpt" as const,
      }));

      const combined = [...ideas, ...sources, ...tasks, ...excerpts];
      const sorted = combined.sort((a, b) => {
        if (a.similarity > b.similarity) {
          return -1;
        }
        if (a.similarity === b.similarity) {
          return 0;
        }
        return 1;
      });

      const final = sorted;

      return final as IConnectable[];
    } catch (error) {
      console.error("Error during semantic search:", error);
      return undefined;
    }
  }

  static async searchSimilarConnectables(
    userId: string | RecordId,
    embedding: number[],
    options: {
      limit?: number;
      threshold?: number;
      candidates?: number;
      rabbitholeId?: string;
      exclude?: string[];
    },
  ): Promise<IConnectable[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Database not initialized");

      const limit = options.limit ?? 10;
      const defaultCandidates = 300;
      const candidates = options.candidates ?? defaultCandidates;
      const exclude = options.exclude ?? [];

      if (!embedding) {
        throw new Error("No embedding vector provided for connectable");
      }

      const threshold = Number.parseFloat(String(options.threshold ?? 0.45));
      if (!Number.isFinite(threshold) || threshold < -1.0 || threshold > 1.0) {
        throw new Error("Invalid similarity threshold provided.");
      }

      const subqueryWhere = [`<-owns<-(user WHERE id = $userId)`];

      if (exclude.length) {
        subqueryWhere.push(`id NOT IN [${exclude.join(", ")}]`);
      }

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

      const tableQuery = (table: string) => {
        const tableWhere: string[] = [];
        if (table === "task") {
          tableWhere.push(`completedAt = NULL`);
        }
        const query = `
          SELECT * FROM (
            SELECT
              *,
              vector::similarity::cosine(embeddings, $embedding) AS similarity
            OMIT embeddings
            FROM ${table}
            WHERE ${[...subqueryWhere, ...tableWhere].join(" AND ")}
          )
          WHERE
            similarity >= ${threshold} AND
            similarity != NaN
          ORDER BY similarity DESC
          LIMIT ${limit};
          `;
        return query;
      };

      const ideaQuery = tableQuery("idea");
      const sourceQuery = tableQuery("source");
      const taskQuery = tableQuery("task");
      const excerptQuery = tableQuery("excerpt");

      const getOfType = async <T extends ISimilarConnectable>(
        query: string,
      ): Promise<ISimilarConnectable[]> => {
        const [results] = await db.query<[T[]]>(query, {
          userId: new StringRecordId(userId),
          embedding: embedding,
          ...(options.rabbitholeId && {
            rabbitholeId: new StringRecordId(options.rabbitholeId),
          }),
        });
        return results;
      };

      const ideas = (
        await getOfType<IIdea & { type: "idea"; similarity: number }>(ideaQuery)
      ).map((i) => ({ ...i, type: "idea" as const }));
      const sources = (
        await getOfType<ISource & { type: "source"; similarity: number }>(
          sourceQuery,
        )
      ).map((s) => ({
        ...s,
        type: "source" as const,
      }));
      const tasks = (
        await getOfType<ITask & { type: "task"; similarity: number }>(taskQuery)
      ).map((t) => ({
        ...t,
        type: "task" as const,
      }));
      const excerpts = (
        await getOfType<IExcerpt & { type: "excerpt"; similarity: number }>(
          excerptQuery,
        )
      ).map((t) => ({
        ...t,
        type: "excerpt" as const,
      }));

      const combined = [...ideas, ...sources, ...tasks, ...excerpts];
      const sorted = combined.sort((a, b) => {
        if (a.similarity > b.similarity) {
          return -1;
        }
        if (a.similarity === b.similarity) {
          return 0;
        }
        return 1;
      });

      const final = sorted;

      return final as IConnectable[];
    } catch (error) {
      console.error("Error during semantic search:", error);
      return undefined;
    }
  }

  public static async getConnectableEmbedding(thingId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Database not initialized");
      const isConnectable = this.isConnectable(thingId);
      if (!isConnectable) {
        console.error(
          "Can't get connectable embedding for non connectable item: ",
          thingId,
        );
        return undefined;
      }
      const table = this.getTable(thingId);
      switch (table) {
        case "idea":
          const idea = await Idea.get(thingId, "full");
          return idea.embeddings;
        case "source":
          const source = await Source.get(thingId);
          return source?.embeddings;
        case "task":
          const task = await Task.get(thingId, "full");
          return task?.embeddings;
        case "excerpt":
          const excerpt = await Excerpt.get(thingId, "full");
          return excerpt?.embeddings;
      }
    } catch (error) {
      console.error(
        "Error getting connectable embedding vector: ",
        thingId,
        error,
      );
      return undefined;
    }
  }

  public static async getConnectableCentroidEmbedding(
    thingId: string | RecordId,
  ) {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Database not initialized");
      const isConnectable = this.isConnectable(thingId);
      if (!isConnectable) {
        console.error(
          "Can't get connectable embedding for non connectable item: ",
          thingId,
        );
        return undefined;
      }
      const result = await db.query<[number[][]]>(
        `
        SELECT VALUE
          embeddings
        FROM (
          SELECT VALUE
              <->connected->(?).{embeddings}
          FROM ONLY $connectableId
        )`,
        {
          connectableId: new StringRecordId(thingId),
        },
      );

      if (!result) {
        throw new Error("Failed to get embeddings");
      }

      const [vectors] = result;
      if (!vectors.length) {
        throw new Error("No embeddings found");
      }

      const centroid = averageEmbeddings(vectors);
      return centroid;
    } catch (error) {
      console.error(
        "Error getting connectable centroid vector: ",
        thingId,
        error,
      );
      return undefined;
    }
  }

  static async getWeightedVector(
    connectableEmbedding: number[] | null,
    averageEmbedding: number[] | null,
  ): Promise<number[]> {
    const emb = getEmbedder();
    try {
      if (!connectableEmbedding?.length && !averageEmbedding?.length) {
        throw new Error("Can't get weighted vector of tag with no embeddings");
      }

      if (connectableEmbedding?.length && averageEmbedding?.length) {
        return weightedAverage(
          connectableEmbedding,
          averageEmbedding,
          this.SUGGESTION_WEIGHT,
        );
      }

      if (!connectableEmbedding?.length && averageEmbedding?.length) {
        return averageEmbedding;
      }

      if (!averageEmbedding?.length && connectableEmbedding?.length) {
        return connectableEmbedding;
      }

      return emb.getEmptyEmbeddings();
    } catch (error) {
      console.error("Error getting weighted vector: ", error);
      return emb.getEmptyEmbeddings();
    }
  }

  public static async getConnectableContent(thingId: string | RecordId) {}

  public static async getUserConnectables(
    userId: StringRecordId,
    filters?: IGraphFilters,
  ) {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Database not initialized");

      const builder = new GraphFilterQueryBuilder().ownedBy(userId.toString());

      if (filters?.rabbithole) {
        builder.inRabbithole(filters.rabbithole);
      }
      if (filters?.date?.createdAt) {
        builder.withDateRange("createdAt", filters.date.createdAt);
      }
      if (filters?.date?.updatedAt) {
        builder.withDateRange("updatedAt", filters.date.updatedAt);
      }
      const { where: queryWhere, params } = builder.build();

      const tableQuery = (table: string) => {
        const tableWhere: string[] = [];
        if (table === "task") {
          tableWhere.push(`completedAt = NULL`);
        }
        const query = `
          SELECT
            *
          OMIT embeddings
          FROM ${table}
          WHERE ${[...queryWhere, ...tableWhere].join(" AND ")}
          `;
        return query;
      };

      const ideaQuery = tableQuery("idea");
      const sourceQuery = tableQuery("source");
      const taskQuery = tableQuery("task");
      const excerptQuery = tableQuery("excerpt");

      const getOfType = async <T extends IConnectable>(
        query: string,
      ): Promise<IConnectable[]> => {
        const [results] = await db.query<[T[]]>(query, params);
        return results;
      };

      const ideas = (await getOfType<IIdea & { type: "idea" }>(ideaQuery)).map(
        (i) => ({ ...i, type: "idea" as const }),
      );
      const sources = (
        await getOfType<ISource & { type: "source" }>(sourceQuery)
      ).map((s) => ({
        ...s,
        type: "source" as const,
      }));
      const tasks = (await getOfType<ITask & { type: "task" }>(taskQuery)).map(
        (t) => ({
          ...t,
          type: "task" as const,
        }),
      );
      const excerpts = (
        await getOfType<IExcerpt & { type: "excerpt" }>(excerptQuery)
      ).map((t) => ({
        ...t,
        type: "excerpt" as const,
      }));

      const combined = [...ideas, ...sources, ...tasks, ...excerpts];

      return combined as IConnectable[];
    } catch (error) {
      console.error("Error getting user connectables: ", error);
      return undefined;
    }
  }

  public static async getAllConnectables(
    userId: StringRecordId,
    options: IGetAllConnectables_Options,
  ) {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Database not initialized");

      const limit = options.limit ?? 20;
      const sortField = options.sortField ?? "updatedAt";
      const sortDirection = options.sortDirection ?? "DESC";

      const builder = new GraphFilterQueryBuilder()
        .ownedBy(userId)
        .sortBy(sortField, sortDirection)
        .limit(limit);

      if (options.cursor) {
        builder.withCursor(options.cursor, sortField);
      }

      if (options.filters?.tags && options.filters.tags.length > 0) {
        builder.withTags(options.filters.tags);
      }

      const {
        where,
        params,
        sort,
        limit: limitClause,
      } = builder.buildQueryParts();

      const tableQuery = (table: string) => {
        const tableWhere: string[] = [];
        if (table === "task") {
          tableWhere.push(`completedAt = NULL`);
        }

        const whereClause =
          where.length > 0 || tableWhere.length > 0
            ? `WHERE ${[...where, ...tableWhere].join(" AND ")}`
            : "";

        const query = `
          SELECT
            *
          OMIT embeddings
          FROM ${table}
          ${whereClause}
          ${sort}
          ${limitClause}
          `;
        return { query, params };
      };

      const ideaBuilder = tableQuery("idea");
      const sourceBuilder = tableQuery("source");
      const taskBuilder = tableQuery("task");
      const excerptBuilder = tableQuery("excerpt");

      const getOfType = async <T>(
        type: IConnectableTypes,
        query: string,
        queryParams: Record<string, any>,
      ): Promise<(T & { type: IConnectableTypes })[]> => {
        const [results] = await db.query<[T[]]>(query, queryParams);
        return results.map((item) => ({ ...item, type }));
      };

      const [ideas, sources, tasks, excerpts] = await Promise.all([
        getOfType<IIdea>("idea", ideaBuilder.query, ideaBuilder.params),
        getOfType<ISource>("source", sourceBuilder.query, sourceBuilder.params),
        getOfType<ITask>("task", taskBuilder.query, taskBuilder.params),
        getOfType<IExcerpt>(
          "excerpt",
          excerptBuilder.query,
          excerptBuilder.params,
        ),
      ]);

      const combined = [...ideas, ...sources, ...tasks, ...excerpts];

      const sorted = combined.sort((a, b) => {
        const dateA = new Date((a as any)[sortField] || 0);
        const dateB = new Date((b as any)[sortField] || 0);

        if (sortDirection === "DESC") {
          return dateB.getTime() - dateA.getTime();
        }
        return dateA.getTime() - dateB.getTime();
      });

      const final = sorted.slice(0, limit);

      const nextCursor =
        final.length === limit ? final[final.length - 1]?.[sortField] : null;

      return {
        items: final as IConnectable[],
        nextCursor,
      };
    } catch (error) {
      console.error("Error getting all connectables: ", error);
      return undefined;
    }
  }

  public static async getUserConnections(
    userId: StringRecordId,
    filters?: IGraphFilters,
  ) {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Database not initialized");

      const queryWhere: string[] = [`<->(?)<-owns<-(user WHERE id = $userId)`];
      const builder = new GraphFilterQueryBuilder();

      if (filters?.rabbithole) {
        // queryWhere.push(`
        //   (
        //     in IN (SELECT VALUE ->includes.out FROM ONLY <record>$rabbitholeId) OR
        //     out IN (SELECT VALUE ->includes.out FROM ONLY <record>$rabbitholeId) OR
        //     in IN (SELECT VALUE ->includes->tag->describes.out FROM ONLY <record>$rabbitholeId)
        //     out IN (SELECT VALUE ->includes->tag->describes.out FROM ONLY <record>$rabbitholeId)
        //   )
        //   `);
        queryWhere.push(`
          (
            <->(?)<-includes<-(rabbithole WHERE id = $rabbitholeId) OR
            <->(?)<-describes<-tag<-includes<-(rabbithole WHERE id = $rabbitholeId)
          )
          `);
      }

      if (filters?.date?.createdAt) {
        builder.withDateRange("createdAt", filters.date.createdAt);
      }

      const { params: filterParams, where: filterWhere } = builder.build();

      const tableWhere: string[] = [];

      const query = `
          SELECT
            *
          FROM connected
          WHERE ${[...queryWhere, ...filterWhere, ...tableWhere].join(" AND ")}
          `;

      const [results] = await db.query<[IConnection[]]>(query, {
        userId: new StringRecordId(userId),
        ...(filters?.rabbithole && {
          rabbitholeId: new StringRecordId(filters.rabbithole),
        }),
        ...filterParams,
      });

      if (!results) {
        throw new Error("Couldn't get connections");
      }

      const connections = results;

      return connections as IConnection[];
    } catch (error) {
      console.error("Error getting user connections: ", error);
      return undefined;
    }
  }

  public static async getUserDescriptions(
    userId: StringRecordId,
    filters?: IGraphFilters,
  ) {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Database not initialized");

      const queryWhere = [`<->(?)<-owns<-(user WHERE id = $userId)`];
      const builder = new GraphFilterQueryBuilder();

      if (filters?.date?.createdAt) {
        builder.withDateRange("createdAt", filters.date.createdAt);
      }

      if (filters?.rabbithole) {
        queryWhere.push(`
          (
            in IN (SELECT VALUE ->includes.out FROM ONLY <record>$rabbitholeId) OR
            out IN (SELECT VALUE ->includes.out FROM ONLY <record>$rabbitholeId) OR
            in IN (SELECT VALUE ->includes->tag->describes.out FROM ONLY <record>$rabbitholeId)
            out IN (SELECT VALUE ->includes->tag->describes.out FROM ONLY <record>$rabbitholeId)
          )
          `);
      }

      const { where: filterWhere, params: filterParams } = builder.build();

      const tableWhere: string[] = [];
      const query = `
          SELECT
            *
          FROM describes
          WHERE ${[...queryWhere, ...filterWhere, ...tableWhere].join(" AND ")}
          `;

      const [results] = await db.query<[ITagDescriptionRelationship[]]>(query, {
        userId: new StringRecordId(userId),
        ...(filters?.rabbithole && {
          rabbitholeId: new StringRecordId(filters.rabbithole),
        }),
        ...filterParams,
      });

      if (!results) {
        throw new Error("Couldn't get tag descriptions");
      }

      const connections = results;

      return connections as ITagDescriptionRelationship[];
    } catch (error) {
      console.error("Error getting user connections: ", error);
      return undefined;
    }
  }

  public static async getUserInclusions(
    userId: StringRecordId,
    filters?: IGraphFilters,
  ) {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Database not initialized");

      const queryWhere = [`<->(?)<-owns<-(user WHERE id = $userId)`];
      if (filters?.rabbithole) {
        queryWhere.push(`in = $rabbitholeId`);
      }

      const builder = new GraphFilterQueryBuilder();

      if (filters?.date?.createdAt) {
        builder.withDateRange("createdAt", filters.date.createdAt);
      }

      const { where: filterWhere, params: filterParams } = builder.build();

      const tableWhere: string[] = [];
      const query = `
          SELECT
            *
          FROM includes
          WHERE ${[...queryWhere, ...filterWhere, ...tableWhere].join(" AND ")}
          `;

      const [results] = await db.query<[IRabbitholeInclusion[]]>(query, {
        userId: new StringRecordId(userId),
        ...filterParams,
        ...(filters?.rabbithole && {
          rabbitholeId: new StringRecordId(filters.rabbithole),
        }),
      });

      if (!results) {
        throw new Error("Couldn't get inclusions");
      }

      const connections = results;

      return connections as IRabbitholeInclusion[];
    } catch (error) {
      console.error("Error getting user connections: ", error);
      return undefined;
    }
  }

  public static async getUserReferences(
    userId: StringRecordId,
    filters?: IGraphFilters,
  ) {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Database not initialized");

      const queryWhere = [`<-owns<-(user WHERE id = $userId)`];

      const builder = new GraphFilterQueryBuilder().ownedBy(userId.toString());

      if (filters?.date?.createdAt) {
        builder.withDateRange("createdAt", filters.date.createdAt);
      }

      if (filters?.rabbithole) {
        builder.inRabbithole(filters.rabbithole);
      }

      const { params: filterParams, where: filterWhere } = builder.build();

      const tableWhere: string[] = [];
      const query = `
        SELECT
          id,
          references,
          createdAt
        FROM excerpt
        WHERE ${[...queryWhere, ...filterWhere, ...tableWhere].join(" AND ")}
        `;

      const [results] = await db.query<
        [
          {
            id: IExcerpt["id"];
            references: IExcerpt["references"];
            createdAt: Date;
          }[],
        ]
      >(query, {
        userId: new StringRecordId(userId),
        ...filterParams,
      });

      if (!results) {
        throw new Error("Couldn't get inclusions");
      }

      const mappedToVirtual: IVirtualExcerptReference[] = results.map(
        ({ id, references, createdAt }) => {
          return {
            id: id.toString() + references?.toString(),
            in: id.toString(),
            out: references?.toString(),
            createdAt: createdAt,
          } as IVirtualExcerptReference;
        },
      );

      return mappedToVirtual as IVirtualExcerptReference[];
    } catch (error) {
      console.error("Error getting user connections: ", error);
      return undefined;
    }
  }

  public static async getUserRabbitholes(
    userId: StringRecordId,
    filters?: IGraphFilters,
  ): Promise<IRabbithole[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Database not initialized");

      if (filters?.rabbithole) {
        const result = await db.query<[IRabbithole]>(
          `
          SELECT
            *
          FROM ONLY $rabbitholeId;
          `,
          {
            rabbitholeId: new StringRecordId(filters.rabbithole),
          },
        );
        return result;
      }

      const queryWhere: string[] = [];

      const builder = new GraphFilterQueryBuilder().ownedBy(userId.toString());

      if (filters?.date?.createdAt) {
        builder.withDateRange("createdAt", filters.date.createdAt);
      }

      if (filters?.date?.updatedAt) {
        builder.withDateRange("updatedAt", filters.date.updatedAt);
      }

      const { params: filterParams, where: filterWhere } = builder.build();

      const tableWhere: string[] = [];
      const query = `
        SELECT
          *
        FROM rabbithole
        WHERE ${[...queryWhere, ...filterWhere, ...tableWhere].join(" AND ")}
        `;

      const [results] = await db.query<[IRabbithole[]]>(query, {
        userId: new StringRecordId(userId),
        ...filterParams,
      });

      if (!results) {
        throw new Error("Couldn't get inclusions");
      }

      return results;
    } catch (error) {
      console.error("Couldn't get user rabbitholes: ", error);
      return undefined;
    }
  }
  public static async getUserTags(
    userId: StringRecordId,
    filters?: IGraphFilters,
  ): Promise<ITag[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Database not initialized");

      const queryWhere: string[] = [];

      const builder = new GraphFilterQueryBuilder().ownedBy(userId.toString());

      if (filters?.date?.createdAt) {
        builder.withDateRange("createdAt", filters.date.createdAt);
      }

      if (filters?.date?.updatedAt) {
        builder.withDateRange("updatedAt", filters.date.updatedAt);
      }

      if (filters?.rabbithole) {
        builder.inRabbithole(filters.rabbithole);
      }

      const { params: filterParams, where: filterWhere } = builder.build();

      const tableWhere: string[] = [];
      const query = `
          SELECT
            *
          FROM tag
          WHERE ${[...queryWhere, ...filterWhere, ...tableWhere].join(" AND ")}
          `;

      const [results] = await db.query<[ITag[]]>(query, {
        userId: new StringRecordId(userId),
        ...filterParams,
      });

      if (!results) {
        throw new Error("Couldn't get inclusions");
      }

      return results;
    } catch (error) {
      console.error("Couldn't get user rabbitholes: ", error);
      return undefined;
    }
  }

  /**
   * Batch ensures that a source is connected to multiple targets.
   * Uses the 'connected' edge.
   * Idempotent and efficient for migration/healing.
   */
  public static async ensureConnected(
    sourceId: string | RecordId,
    targetIds: (string | RecordId)[],
  ) {
    try {
      console.log("Ensuring connections: ", sourceId, targetIds);
      if (!this.isConnectable(sourceId)) {
        throw new Error("Source is not connectable");
      }

      if (!targetIds || targetIds.length === 0) {
        return;
      }

      const db = await getDatabase();
      if (!db) throw new Error("Database not initialized");

      const formattedSource = new StringRecordId(sourceId);
      const formattedTargets = targetIds
        .filter((id) => this.isConnectable(id))
        .map((id) => new StringRecordId(id));

      if (formattedTargets.length === 0) return;

      await db.query(
        `
        FOR $target IN $targets {
          LET $existing = (SELECT VALUE id FROM connected WHERE in = $source AND out = $target LIMIT 1);
          IF count($existing) = 0 {
            RELATE $source->connected->$target SET createdAt = time::now();
          }
        };
        `,
        {
          source: formattedSource,
          targets: formattedTargets,
        },
      );

      return true;
    } catch (error) {
      console.error(
        `Error during ensureConnected for source "${sourceId}":`,
        error,
      );
      return false;
    }
  }
}

export const initGraph = async () => {
  await GraphService.up();
};

export type ILoadedConstellation = Partial<{
  things: IConnectable[];
  rabbitholes: IRabbithole[];
  tags: ITag[];
  connections: IConnection[];
  inclusions: IRabbitholeInclusion[];
  descriptions: ITagDescriptionRelationship[];
  references: IVirtualExcerptReference[];
}>;

export type IConstellationLoader = Partial<{
  things: boolean;
  rabbitholes: boolean;
  tags: boolean;
  connections: boolean;
  inclusions: boolean;
  descriptions: boolean;
  references: boolean;
}>;

export class ConstellationLoader {
  private userId: StringRecordId;
  private rabbitholeId?: StringRecordId;
  private filters?: IGraphFilters;

  constructor(config: {
    userId: string | RecordId;
    rabbitholeId?: string | RecordId;
    filters?: IGraphFilters;
  }) {
    const { userId, rabbitholeId } = config;
    this.userId = new StringRecordId(userId);
    this.rabbitholeId = rabbitholeId
      ? new StringRecordId(rabbitholeId)
      : undefined;
    this.filters = config.filters;
  }

  public async load(
    loader: IConstellationLoader,
  ): Promise<ILoadedConstellation | undefined> {
    try {
      const promises: Promise<Partial<ILoadedConstellation>>[] = [];
      if (loader.things) {
        promises.push(this.connectables().then((res) => ({ things: res })));
      }
      if (loader.connections) {
        promises.push(this.connections().then((res) => ({ connections: res })));
      }
      if (loader.rabbitholes) {
        promises.push(this.rabbitholes().then((res) => ({ rabbitholes: res })));
      }
      if (loader.inclusions) {
        promises.push(this.inclusions().then((res) => ({ inclusions: res })));
      }
      if (loader.tags) {
        promises.push(this.tags().then((res) => ({ tags: res })));
      }
      if (loader.descriptions) {
        promises.push(
          this.descriptions().then((res) => ({ descriptions: res })),
        );
      }
      if (loader.references) {
        promises.push(this.references().then((res) => ({ references: res })));
      }

      const results = await Promise.all(promises);
      const loaded: Partial<ILoadedConstellation> = Object.assign(
        {},
        ...results,
      );

      return loaded;
    } catch (error) {
      console.error("Error loading user constellation: ", error);
      return undefined;
    }
  }

  public async connectables(): Promise<IConnectable[] | undefined> {
    try {
      const connectables = await GraphService.getUserConnectables(
        this.userId,
        this.filters,
      );
      if (!connectables) {
        throw new Error("Couldn't get connectables");
      }
      return connectables;
    } catch (error) {
      console.error("Error getting user connectables: ", this.userId, error);
      return undefined;
    }
  }

  public async connections(): Promise<IConnection[] | undefined> {
    try {
      const connections = await GraphService.getUserConnections(
        this.userId,
        this.filters,
      );
      if (!connections) {
        throw new Error("Couldn't get connections");
      }
      return connections;
    } catch (error) {
      console.error("Error getting user connections: ", this.userId, error);
      return undefined;
    }
  }

  public async rabbitholes(): Promise<IRabbithole[] | undefined> {
    try {
      const rabbitholes = GraphService.getUserRabbitholes(
        this.userId,
        this.filters,
      );
      if (!rabbitholes) {
        throw new Error("Couldn't get rabbitholes");
      }
      return rabbitholes;
    } catch (error) {
      console.error("Error getting user rabbitholes: ", this.userId, error);
      return undefined;
    }
  }

  public async inclusions(): Promise<IRabbitholeInclusion[] | undefined> {
    try {
      const inclusions = await GraphService.getUserInclusions(
        this.userId,
        this.filters,
      );
      if (!inclusions) {
        throw new Error("Couldn't get rabbithole inclusions");
      }
      return inclusions;
    } catch (error) {
      console.error(
        "Error getting user rabbithole inclusions: ",
        this.userId,
        error,
      );
      return undefined;
    }
  }

  public async tags(): Promise<ITag[] | undefined> {
    try {
      const tags = await GraphService.getUserTags(this.userId, this.filters);
      if (!tags) {
        throw new Error("Couldn't get tags");
      }
      return tags;
    } catch (error) {
      console.error("Error getting user tags: ", this.userId, error);
      return undefined;
    }
  }

  public async descriptions(): Promise<
    ITagDescriptionRelationship[] | undefined
  > {
    try {
      const descriptions = await GraphService.getUserDescriptions(this.userId);
      if (!descriptions) {
        throw new Error("Couldn't get descriptions");
      }
      return descriptions;
    } catch (error) {
      console.error("Error getting user descriptions: ", this.userId, error);
      return undefined;
    }
  }

  public async references(): Promise<IVirtualExcerptReference[] | undefined> {
    try {
      const references = await GraphService.getUserReferences(this.userId);
      if (!references) {
        throw new Error("Couldn't get references");
      }
      return references;
    } catch (error) {
      console.error("Error getting user references: ", this.userId, error);
      return undefined;
    }
  }
}

export class GraphFilterQueryBuilder {
  private whereClauses: string[] = [];
  private params: Record<string, any> = {};

  constructor() {} // Start with a clean slate

  /**
   * Adds a filter to ensure all items are owned by the specified user.
   * This is a fundamental clause that was previously handled outside the builder.
   * Bringing it inside makes the builder more self-contained.
   */
  public ownedBy(userId: string | RecordId): this {
    this.whereClauses.push(`<-owns<-(user WHERE id = $userId)`);
    this.params.userId = new StringRecordId(userId);
    return this;
  }

  /**
   * Adds a date-based filter for a specific field.
   * @param field The database field name (e.g., 'createdAt', 'updatedAt').
   * @param options An object with optional 'before' and 'after' date strings.
   */
  public withDateRange(
    field: "createdAt" | "updatedAt" | "viewedAt",
    options: { after?: string; before?: string },
  ): this {
    const { after, before } = options;
    const afterDate = after ? new Date(after) : null;
    const beforeDate = before ? new Date(before) : null;

    if (
      afterDate &&
      !isNaN(afterDate.getTime()) &&
      beforeDate &&
      !isNaN(beforeDate.getTime())
    ) {
      this.whereClauses.push(
        `${field} >= $${field}After AND ${field} <= $${field}Before`,
      );
      this.params[`${field}After`] = afterDate;
      this.params[`${field}Before`] = beforeDate;
    } else if (afterDate && !isNaN(afterDate.getTime())) {
      this.whereClauses.push(`${field} > $${field}After`);
      this.params[`${field}After`] = afterDate;
    } else if (beforeDate && !isNaN(beforeDate.getTime())) {
      this.whereClauses.push(`${field} < $${field}Before`);
      this.params[`${field}Before`] = beforeDate;
    }
    return this; // Return 'this' to allow chaining
  }

  /**
   * Adds the rabbithole filter.
   */
  public inRabbithole(rabbitholeId: string | RecordId): this {
    const clause = `
      (
        id IN (SELECT VALUE ->includes.out FROM ONLY <record>$rabbitholeId) OR
        id IN (SELECT VALUE ->includes->tag->describes.out FROM ONLY <record>$rabbitholeId)
      )
    `;
    this.whereClauses.push(clause);
    this.params.rabbitholeId = new StringRecordId(rabbitholeId);
    return this;
  }

  // You can add more specific, chainable methods here
  // public withTags(tags: string[]): this { ... }
  // public excludeIds(ids: (string | RecordId)[]): this { ... }

  /**
   * Finalizes the chain and returns the generated clauses and parameters.
   */
  public build(): { where: string[]; params: Record<string, any> } {
    return {
      where: this.whereClauses,
      params: this.params,
    };
  }
}

export type IConnectableFields = {
  id: string | RecordId;
  name: string;
  content: string;
  description: string;
  type: IConnectableTypes;
};

export class Connectable {
  private _thingId: RecordId | string;
  private _type: IConnectableTypes;

  constructor(thingId: RecordId | string) {
    this._thingId = thingId;
    const type = Connectable.idToType(thingId.toString());
    if (!type) {
      throw new Error("The Connectable id is not a valid connectable type!");
    }
    this._type = type;
  }

  public get thingId() {
    return this._thingId;
  }

  public get type(): IConnectableTypes {
    return this._type;
  }

  public static getterResolver: {
    [K in keyof IConnectableTypeMap]: (
      id: RecordId | string,
    ) => Promise<IConnectableTypeMap[K] | undefined>;
  } = {
    idea: async (id: string | RecordId) => {
      return await Idea.get(id, "full");
    },
    task: async (id: string | RecordId) => {
      return await Task.get(id, "full");
    },
    source: async (id: string | RecordId) => {
      return await Source.get(id);
    },
    excerpt: async (id: string | RecordId) => {
      return await Excerpt.get(id, "full");
    },
  };

  public static fieldsResolver: {
    [K in keyof IConnectableTypeMap]: (
      i: IConnectableTypeMap[K],
    ) => IConnectableFields;
  } = {
    idea: (idea: IIdea) => {
      return {
        id: idea.id,
        name: idea.title,
        description:
          idea.contentPlain?.slice(0, 256) || "No description available.",
        content: idea.content,
        type: "idea",
      };
    },
    source: (source: ISource) => {
      return {
        id: source.id,
        name: source.displayName,
        description:
          source.content?.slice(0, 256) || "No description available.",
        content: source.content,
        type: "source",
      };
    },
    task: (task: ITask | IPublicTask) => {
      return {
        id: task.id,
        name: task.description.slice(0, 124),
        description:
          task.scratchpad?.slice(0, 256) || "No description available.",
        content: task.scratchpad,
        type: "task",
      };
    },
    excerpt: (excerpt: IExcerpt) => {
      return {
        id: excerpt.id,
        name: excerpt.note,
        description:
          excerpt.sourceText?.slice(0, 256) || "No description available.",
        content: excerpt.sourceText,
        type: "excerpt",
      };
    },
  };

  public static idToType = (id: string): IConnectableTypes | undefined => {
    if (id.startsWith("idea")) {
      return "idea";
    }
    if (id.startsWith("source")) {
      return "source";
    }
    if (id.startsWith("task")) {
      return "task";
    }
    if (id.startsWith("excerpt")) {
      return "excerpt";
    }
  };

  public async get<T extends IConnectable>(): Promise<T | undefined> {
    try {
      const thingId = this.thingId;
      const type = this.type;
      if (!type) {
        throw new Error("Couldn't get type of connectable");
      }
      const thing = await Connectable.getterResolver[type]?.(thingId);
      return thing as T;
    } catch (error) {
      console.error("Error getting thing: ", this.thingId, error);
      return undefined;
    }
  }

  public async fields(): Promise<IConnectableFields | undefined> {
    try {
      const type = this.type;
      if (!type) {
        throw new Error("Couldn't get type of connectable");
      }
      const thing = (await this.get()) as IConnectable;
      if (!thing) {
        throw new Error("Couldn't get connectable");
      }
      const fields = Connectable.fieldsResolver[type]?.(thing as any);
      return fields;
    } catch (error) {
      console.error("Error getting connectable fields: ", error);
      return undefined;
    }
  }

  public static async connectableFields(
    connectable: IConnectable,
  ): Promise<IConnectableFields | undefined> {
    try {
      const type = this.idToType(connectable.id.toString());
      if (!type) {
        throw new Error(
          `Couldn't get type of connectable: ${connectable.id.toString()}`,
        );
      }
      const fields = Connectable.fieldsResolver[type]?.(connectable as any);
      return fields;
    } catch (error) {
      console.error("Error getting static connectable fields: ", error);
      return undefined;
    }
  }
}
