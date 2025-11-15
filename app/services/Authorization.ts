import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../database/db";
import { User } from "../database/models/user";

export default class Authorization {
  private _userId: string | RecordId | StringRecordId;

  constructor(userId: string | RecordId | StringRecordId) {
    this._userId = userId;
  }

  get userId(): string {
    return this._userId.toString();
  }

  async user() {
    return await User.get(this.userId);
  }

  async owns(thingId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not available.");
      }
      const results = await db.query<[number]>(
        `count(SELECT VALUE id FROM owns WHERE in = $userId AND out = $thingId)`,
        {
          userId: new StringRecordId(this.userId),
          thingId: new StringRecordId(thingId),
        },
      );
      if (!results) {
        throw new Error("No results for ownership check");
      }
      const owns = results[0] > 0;
      return owns;
    } catch (error) {
      console.error("Error checking user owns: ", this.userId, thingId, error);
      return undefined;
    }
  }

  async hasAccess(thingId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not available.");
      }
      const results = await db.query<[number]>(
        `count(SELECT VALUE id FROM owns WHERE in = $userId AND out = $thingId)`,
        {
          userId: new StringRecordId(this.userId),
          thingId: new StringRecordId(thingId),
        },
      );
      if (!results) {
        throw new Error("No results for ownership check");
      }
      const owns = results[0] > 0;
      return owns;
    } catch (error) {
      console.error("Error checking user owns: ", this.userId, thingId, error);
      return undefined;
    }
  }

  static async checkOwns(
    userId: string | RecordId,
    thingId: string | RecordId,
  ) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not available.");
      }
      const results = await db.query<[number]>(
        `count(SELECT VALUE id FROM owns WHERE in = $userId AND out = $thingId)`,
        {
          userId: new StringRecordId(userId),
          thingId: new StringRecordId(thingId),
        },
      );
      if (!results) {
        throw new Error("No results for ownership check");
      }
      const owns = results[0] > 0;
      return owns;
    } catch (error) {
      console.error("Error checking user owns: ", userId, thingId, error);
      return undefined;
    }
  }

  static async checkHasAccess(
    userId: string | RecordId,
    thingId: string | RecordId,
  ) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not available.");
      }
      const results = await db.query<[number]>(
        `count(SELECT VALUE id FROM owns WHERE in = $userId AND out = $thingId)`,
        {
          userId: new StringRecordId(userId),
          thingId: new StringRecordId(thingId),
        },
      );
      if (!results) {
        throw new Error("No results for ownership check");
      }
      const owns = results[0] > 0;
      return owns;
    } catch (error) {
      console.error("Error checking user owns: ", userId, thingId, error);
      return undefined;
    }
  }
}
