import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../database/db";
import { Idea, IIdea, ISafeIdea } from "../database/models/ideas";
import Source, { ISource } from "../database/models/source";
import Task, { ITask } from "../database/models/task";
import { ISearchResult } from "./Search";

export type IConnectableTypes = "idea" | "source" | "task";

export type IConnectable =
  | ((ISafeIdea | IIdea) & {
      type: "idea";
      direction?: "incoming" | "outgoing";
    })
  | (ISource & { type: "source"; direction?: "incoming" | "outgoing" })
  | (ITask & { type: "task"; direction?: "incoming" | "outgoing" });

export type ISimilarConnectable = IConnectable & { similarity: number };

export type IConnection = {
  id: string | RecordId;
  in: string | RecordId;
  out: string | RecordId;
};

export default class GraphService {
  constructor() {}

  private static _connectionTypes = {
    idea: { outgoing: "connected", incoming: "connected" },
    source: { outgoing: "connected", incoming: "connected" },
    task: { outgoing: "connected", incoming: "connected" },
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

    await db.query(getSourceConnectionsFunction());
  }

  public static async connect(
    source: string | RecordId,
    target: string | RecordId,
  ) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }
      const canConnectSource = this.isConnectable(source);
      const canConnectTarget = this.isConnectable(target);
      if (!canConnectSource) {
        throw new Error("Can't connect source");
      }
      if (!canConnectTarget) {
        throw new Error("Can't connect target");
      }
      const result = await db.query<[IConnection]>(
        `RELATE $sourceId->connected->$targetId CONTENT { createdAt: $now, }`,
        {
          sourceId: new StringRecordId(source),
          targetId: new StringRecordId(target),
          now: new Date(),
        },
      );
      if (!result) {
        console.error("No link created.");
        return undefined;
      }
      const [connection] = result;
      return connection;
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

      const limit = options.limit ?? 10;
      const defaultCandidates = 300;
      const candidates = options.candidates ?? defaultCandidates;

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

      const combined = [...ideas, ...sources, ...tasks];
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
    },
  ): Promise<IConnectable[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Database not initialized");

      const limit = options.limit ?? 10;
      const defaultCandidates = 300;
      const candidates = options.candidates ?? defaultCandidates;

      if (!embedding) {
        throw new Error("No embedding vector provided for connectable");
      }

      const threshold = Number.parseFloat(String(options.threshold ?? 0.45));
      if (!Number.isFinite(threshold) || threshold < -1.0 || threshold > 1.0) {
        throw new Error("Invalid similarity threshold provided.");
      }

      const subqueryWhere = [`<-owns<-(user WHERE id = $userId)`];

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

      const combined = [...ideas, ...sources, ...tasks];
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
}

export const initGraph = async () => {
  await GraphService.up();
};
