import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../db";

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
  constructor() {}

  static async create(userId: string | RecordId) {}

  static async connectToUser(
    userId: string | RecordId,
    importId: string | RecordId,
  ) {
    try {
      const db = await getDatabase();
      const result = await db?.query<[IImportUserOwnership]>(
        `RELATE $fromId -> imported -> $toId SET createdAt = $now;`,
        {
          fromId: new StringRecordId(userId),
          toId: new StringRecordId(importId),
          now: new Date(),
        },
      );
      if (!result) {
        console.error(
          `No ownership created for import "${importId}" and user "${userId}".`,
        );
        return undefined;
      }
      const [ownership] = result;
      return ownership;
    } catch (err) {
      console.error(
        `Error during connectToUser for import "${importId}":`,
        err,
      );
      return undefined;
    }
  }
}
