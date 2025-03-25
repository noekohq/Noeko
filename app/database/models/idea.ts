import { RecordId, RecordIdValue, StringRecordId } from "surrealdb";
import { getDatabase } from "../db";
import { Embeddings } from "../../semantics/embeddings";

export type IIdea = {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  contentUpdatedAt: Date;
  embeddingsUpdatedAt: Date;
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

export class Idea {
  constructor() {}

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

  static async graph() {
    try {
      const db = await getDatabase();
      const ideas = await db?.select<IIdea>("idea");
      if (!ideas) {
        console.error("No ideas found.");
        return undefined;
      }
      const edges = await db?.select<IIdeaConnection>("connection");
      return { ideas, edges };
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async update(id: string, form: Partial<IIdeaForm>) {
    try {
      const db = await getDatabase();
      console.log("Merging data: ", form);
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
      const result = await db?.query<IIdeaConnection[]>(
        "DELETE FROM connection WHERE source = ? AND target = ?",
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

  static async loadEmbeddings(id: string) {
    try {
      const db = await getDatabase();
      const result = await db?.select<IIdea>(new StringRecordId(id));
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

      console.log("Idea: ", idea);

      if (!idea) {
        console.error(`Idea with id ${id} not found.`);
        return;
      }

      return idea;
    } catch (error) {
      console.error(error);
    }
  }
}
