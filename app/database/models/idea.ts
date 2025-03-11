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
  id: string;
  content: string;

  constructor(id: string, content: string) {
    this.id = id;
    this.content = content;
  }

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

  async all() {
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
}
