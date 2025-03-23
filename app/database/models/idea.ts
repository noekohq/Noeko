import { RecordId, RecordIdValue, StringRecordId } from "surrealdb";
import { getDatabase } from "../db";

export type IIdea = {
  id: string;
  title: string;
  content: string;
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
      const result = await db?.create<IIdea, IIdeaForm>("idea", {
        title: form.title,
        content: form.content,
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
    console.log("Getting idea with id:", id);
    try {
      const db = await getDatabase();
      const result = await db?.select<IIdea>(new StringRecordId(id));
      console.log("got idea: ", result);
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

  static async update(id: RecordIdValue, form: Partial<IIdeaForm>) {
    try {
      const db = await getDatabase();
      const result = await db?.update<IIdea, Partial<IIdeaForm>>(
        new RecordId("idea", id),
        {
          title: form.title,
          content: form.content,
        },
      );
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

  static async delete(id: RecordIdValue) {
    try {
      const db = await getDatabase();
      const result = await db?.delete<IIdea>(new RecordId("idea", id));
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
}
