import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../db";
import { User } from "./user";
import { randomUUIDv7 } from "bun";
import { Idea } from "./ideas";
import { IIdeaForm } from "../../../shared/types/idea";

export type IImport = {
  id: string | RecordId;
  name: string;
  createdAt: Date;
};

export type IImportForm = Omit<IImport, "id" | "createdAt">;

export type IImportUserOwnership = {
  id: string | RecordId;
  in: string | RecordId;
  out: string | RecordId;
};

export class Import {
  private instance: IImport | undefined;
  private instanceId: StringRecordId | undefined;

  constructor(id?: string | RecordId) {
    this.instanceId = id ? new StringRecordId(id) : undefined;
    if (id) {
      (async () => {
        const result = await Import.get(id);
        if (result) {
          this.instance = result;
        }
      })();
    }
  }

  async get() {
    return this.instance;
  }

  static async up() {
    const userImportsFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::get_user_imports(
        $userId: string,
      ) {
        LET $imports = SELECT VALUE ->initiated_import->import FROM ONLY <record> userId;
        return $imports;
      }`;
    };

    const db = await getDatabase();
    if (!db) {
      throw new Error("Something went wrong getting the database");
    }
    db.query(userImportsFunction());
  }

  static down() {}

  static getImportName() {
    return randomUUIDv7();
  }

  static async create(userId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database to create feedback");
      }
      const user = await User.get(userId);
      if (!user) {
        throw new Error("Tried to create import for user that does not exist");
      }
      const result = await db.create<
        IImport,
        IImportForm & {
          createdAt: Date;
        }
      >("import", {
        name: Import.getImportName(),
        createdAt: new Date(),
      });
      if (!result) {
        throw new Error("Result from import creation is falsey");
      }
      const [importRecord] = result;
      await Import.connectToUser(user.id, importRecord.id);
      return importRecord;
    } catch (error) {
      console.error("Error creating import: ", error);
      return undefined;
    }
  }

  static async get(id: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }
      const result = await db.select<IImport>(new StringRecordId(id));
      if (!result) {
        throw new Error("Could not find import with id: " + id.toString());
      }
      const importItem = result;
      return importItem;
    } catch (error) {
      console.error("Error getting import: ", error);
      return undefined;
    }
  }

  static async connectToUser(userId: string | RecordId, importId: string | RecordId) {
    try {
      const db = await getDatabase();
      const result = await db?.query<[IImportUserOwnership]>(
        `RELATE $fromId -> initiated_import -> $toId SET createdAt = $now;`,
        {
          fromId: new StringRecordId(userId),
          toId: new StringRecordId(importId),
          now: new Date(),
        }
      );
      if (!result) {
        console.error(`No ownership created for import "${importId}" and user "${userId}".`);
        return undefined;
      }
      const [ownership] = result;
      return ownership;
    } catch (err) {
      console.error(`Error during connectToUser for import "${importId}":`, err);
      return undefined;
    }
  }

  static async connectToIdea(ideaId: string | RecordId, importId: string | RecordId) {
    try {
      const db = await getDatabase();
      const result = await db?.query<[IImportUserOwnership]>(
        `RELATE $fromId -> imported -> $toId SET createdAt = $now;`,
        {
          fromId: new StringRecordId(importId),
          toId: new StringRecordId(ideaId),
          now: new Date(),
        }
      );
      if (!result) {
        console.error(`No relation created for import "${importId}" and idea "${ideaId}".`);
        return undefined;
      }
      const [ownership] = result;
      return ownership;
    } catch (err) {
      console.error(`Error during connectToIdea for import "${importId}":`, err);
      return undefined;
    }
  }

  static async connectToIdeas(ideaIds: (string | RecordId)[], importId: string | RecordId) {
    try {
      const db = await getDatabase();
      const result = await db?.query<[IImportUserOwnership[]]>(
        `RELATE $fromId -> imported -> $toIds SET createdAt = $now;`,
        {
          fromId: new StringRecordId(importId),
          toIds: ideaIds.map((i) => new StringRecordId(i)),
          now: new Date(),
        }
      );
      if (!result) {
        console.error(`No relation created for import "${importId}" and many ideas".`);
        return undefined;
      }
      const [ownership] = result;
      return ownership;
    } catch (err) {
      console.error(`Error during connectToIdea for import "${importId}":`, err);
      return undefined;
    }
  }

  static async getUserImports(userId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }
      const results = await db.run<IImport[]>("fn::get_user_imports", [userId.toString()]);
      if (!results) {
        throw new Error("Error getting user imports");
      }
      return results;
    } catch (error) {
      console.error("Error getting user imports: ", error);
      return undefined;
    }
  }

  static async createIdeaForImport(
    idea: IIdeaForm,
    importId: string | RecordId,
    userId: string | RecordId
  ) {
    try {
      const db = await getDatabase();
      if (db) {
        throw new Error("Couldn't get database.");
      }
      const importer = await Import.get(importId);
      if (!importer) {
        throw new Error("Tried to create idea for import that doesn't exist");
      }
      const createdIdea = await Idea.create(idea, userId);
      if (!createdIdea) {
        throw new Error("Error creating idea");
      }
    } catch (error) {
      console.error("Error creating idea for import: ", error);
      return undefined;
    }
  }

  static async checkUserOwnership(importId: string, userId: string) {
    try {
      const db = await getDatabase();
      const result = await db?.query<[number]>( // Expecting an array with one object: [{ count: number }]
        `count(SELECT id FROM owns WHERE in = $userId AND out = $importId);`,
        {
          userId: new StringRecordId(userId),
          importId: new StringRecordId(importId),
        }
      );

      if (result && result[0] && result[0] > 0) {
        return true;
      }
      return false;
    } catch (err) {
      console.error(`Error during checkUserOwnership for idea "${importId}":`, err);
      return false;
    }
  }
}
