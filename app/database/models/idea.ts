import { RecordId, RecordIdValue, StringRecordId } from "surrealdb";
import { getDatabase } from "../db";
import { Embeddings } from "../../semantics/embeddings";

export type IIdea = {
  id: string;
  title: string;
  content: string;
  embeddings: Embeddings | null;
  createdAt: Date;
  updatedAt: Date;
  contentUpdatedAt: Date;
  embeddingsUpdatedAt: Date;
};

export type IIdeaWithComputedFields = IIdea & {
  embeddingsOutOfDate: boolean;
};

export type IIdeaAsRelation = IIdea & {
  distance: number;
};

export type IIdeaForm = Omit<IIdea, "id">;

export type IIdeaConnection = {
  id: string;
  in: string;
  out: string;
};

export type IDBGraph = {
  ideas: IIdea[];
  edges: IIdeaConnection[];
};

export type IDBGraphWithComputedFields = IDBGraph & {
  ideas: IIdeaWithComputedFields[];
};

export class Idea {
  constructor() {}

  static attachComputedFields(idea: IIdea): IIdeaWithComputedFields {
    return {
      ...idea,
      embeddingsOutOfDate:
        new Date(idea.contentUpdatedAt) < new Date(idea.embeddingsUpdatedAt),
    };
  }

  static attachComputedFieldsToCollection(
    ideas: IIdea[],
  ): IIdeaWithComputedFields[] {
    return ideas.map(Idea.attachComputedFields);
  }

  static async create(form: IIdeaForm) {
    try {
      const db = await getDatabase();
      const result = await db?.create<
        IIdea,
        IIdeaForm & {
          createdAt: Date;
          updatedAt: Date;
          embeddingsUpdatedAt: Date;
        }
      >("idea", {
        title: form.title,
        content: form.content,
        embeddings: null,
        contentUpdatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        embeddingsUpdatedAt: new Date(),
      });
      if (!result) {
        console.error("No idea created.");
        return undefined;
      }
      return result;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async get(id: string) {
    try {
      const db = await getDatabase();
      const result = await db?.select<IIdea>(new StringRecordId(id));
      if (!result) {
        console.error(`Idea with id ${id} not found.`);
        return;
      }
      return result;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async all(filters: any) {
    try {
      const db = await getDatabase();
      const result = await db?.select<IIdea>("idea");
      if (!result) {
        console.error("No ideas found.");
        return undefined;
      }
      return result;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async graph(
    filters?:
      | {
          highlightedNode?: string;
        }
      | "none",
    options?: { computeFields: boolean },
  ) {
    try {
      const db = await getDatabase();
      const ideas = await db?.select<IIdea>("idea");
      if (!ideas) {
        console.error("No ideas found.");
        return undefined;
      }
      const edges = await db?.select<IIdeaConnection>("connection");
      if (options?.computeFields) {
        const computedIdeas = Idea.attachComputedFieldsToCollection(ideas);
        return {
          ideas: computedIdeas,
          edges,
        } as IDBGraphWithComputedFields;
      }
      return { ideas, edges } as IDBGraph;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async update(id: string, form: Partial<IIdeaForm>) {
    try {
      const db = await getDatabase();
      const updater: Partial<IIdeaForm> & { contentUpdatedAt?: Date } = form;
      if (form.content !== undefined) {
        updater.contentUpdatedAt = new Date();
      }
      const result = await db?.merge<
        IIdea,
        Partial<IIdeaForm> & { updatedAt: Date }
      >(new StringRecordId(id), {
        ...updater,
        updatedAt: new Date(),
      });
      if (!result) {
        console.error("No idea updated.");
        return undefined;
      }
      return result;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async delete(id: string) {
    try {
      const db = await getDatabase();
      const result = await db?.delete<IIdea>(new StringRecordId(id));
      if (!result) {
        console.error("No idea deleted.");
        return undefined;
      }
      return result;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async connect(from: string, to: string) {
    try {
      const db = await getDatabase();
      const result = await db?.relate<IIdeaConnection>(from, "connection", to);
      if (!result) {
        console.error("No link created.");
        return undefined;
      }
      return result;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async disconnect(source: string, target: string) {
    try {
      const db = await getDatabase();
      const result = await db?.query<(IIdeaConnection & { id: RecordId })[]>(
        "DELETE FROM connection WHERE source = $source AND target = $target",
        {
          source,
          target,
        },
      );
      if (!result) {
        console.error("No connection deleted.");
        return undefined;
      }
      return result;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async getConnections(id: string) {
    try {
      const db = await getDatabase();
      const result = await db?.query<[(IIdeaConnection & { id: RecordId })[]]>(
        "SELECT * FROM connection WHERE source = $source OR target = $source",
        {
          id,
        },
      );
      if (!result) {
        console.error("No connections found.");
        return undefined;
      }
      const [connections] = result;
      return connections;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async getMany(ids: string[]) {
    try {
      const db = await getDatabase();
      const result = await db?.query<(IIdea & { id: RecordId })[]>(
        "SELECT * FROM idea WHERE id IN ($ids)",
        {
          ids,
        },
      );
      if (!result) {
        console.error("No ideas found.");
        return undefined;
      }
      return result;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async loadEmbeddings(id: string) {
    try {
      console.log("Loading embeddings for idea with id", id);
      const db = await getDatabase();
      const result = await db?.select<IIdea & { id: RecordId }>(
        new StringRecordId(id),
      );
      if (!result) {
        console.error(`Idea with id ${id} not found.`);
        return;
      }
      const e = new Embeddings();
      const embeddings = await e.generateEmbeddings(result.content);

      const idea = await db?.merge<
        IIdea,
        { embeddings: number[]; embeddingsUpdatedAt: Date }
      >(new StringRecordId(id), {
        embeddings,
        embeddingsUpdatedAt: new Date(),
      });

      if (!idea) {
        console.error(`Idea with id ${id} not found.`);
        return;
      }

      return idea;
    } catch (error) {
      console.error(error);
    }
  }

  static async findSimilar(
    rootNodeId: string,
    options: { limit?: number } = { limit: 10 },
  ) {
    try {
      const db = await getDatabase();
      const rootNode = await Idea.get(rootNodeId);
      if (!rootNode) {
        console.error(`Root node with id ${rootNodeId} not found.`);
        return;
      }
      const limit = options.limit;
      const result = await db?.query<[(IIdeaAsRelation & { id: RecordId })[]]>(
        `
        SELECT
            *,
            vector::distance::euclidean(embeddings, $query_embedding) AS distance
        FROM
            idea
        ORDER BY
            distance ASC
        LIMIT ${limit};
        `,
        {
          query_embedding: rootNode.embeddings,
        },
      );
      if (!result) {
        console.error(`No ideas found.`);
        return;
      }
      const [ideas] = result;
      const filteredIdeas = ideas.filter((idea) => {
        console.log("Comparing:", idea.id.toString(), rootNodeId);
        return idea.id.toString() !== rootNodeId;
      });
      return filteredIdeas;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async semanticSearch(embedding: number[], limit: number = 10) {
    try {
      const db = await getDatabase();
      const result = await db?.query<[(IIdeaAsRelation & { id: RecordId })[]]>(
        `
        SELECT
            *,
            vector::distance::euclidean(embeddings, $query_embedding) AS distance
        FROM
            idea
        ORDER BY
            distance ASC
        LIMIT ${limit};
        `,
        {
          query_embedding: embedding,
        },
      );
      if (!result) {
        console.error(`No ideas found.`);
        return;
      }
      const [ideas] = result;
      console.log("Items: ", result);
      return ideas;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }
}
