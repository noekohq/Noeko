import { RecordId, RecordIdValue } from "surrealdb";
import { Database } from "../db";

export type IIdea = {
  id: string;
  content: string;
};

export type IIdeaForm = Omit<IIdea, "id">;

export type IIdeaConnection = {
  id: string;
  in: string;
  out: string;
};

export class Idea {
  constructor() {}

  async create(form: IIdeaForm) {
    try {
      const result = await Database.db?.create<IIdea, IIdeaForm>("idea", {
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

  async all(filters: any) {
    try {
      const result = await Database.db?.select<IIdea>("idea");
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

  async graph() {
    try {
      const ideas = await Database.db?.select<IIdea>("idea");
      if (!ideas) {
        console.error("No ideas found.");
        return undefined;
      }
      const edges = Database.db?.select<IIdeaConnection>("connection");
      return { ideas, edges };
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  async update(id: RecordIdValue, form: IIdeaForm) {
    try {
      const result = await Database.db?.update<IIdea, IIdeaForm>(
        new RecordId("idea", id),
        {
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

  async delete(id: RecordIdValue) {
    try {
      const result = await Database.db?.delete<IIdea>(new RecordId("idea", id));
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

  async connect(from: string, to: string) {
    try {
      const result = await Database.db?.relate<IIdeaConnection>(
        from,
        "connection",
        to,
      );
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

  async disconnect(source: string, target: string) {
    try {
      const result = await Database.db?.query<IIdeaConnection[]>(
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
