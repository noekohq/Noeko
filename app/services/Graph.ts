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

export type IConnectableTypes = "idea" | "source" | "task";

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
