import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../db";
import GraphService, { Connectable, IConnectable } from "../../services/Graph";

export type IPinnable = IConnectable;

export interface IPin {
  id: string | RecordId;
  in: string | RecordId;
  out: string | RecordId;
}

export default class Pin {
  constructor() {}

  public static async pinThing(
    userId: string | RecordId,
    thingId: string | RecordId,
  ) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not initialized");
      }
      const result = await db.query<[IPin[]]>(
        `RELATE $userId->pins->$thingId CONTENT { createdAt: $now }`,
        {
          userId: new StringRecordId(userId),
          thingId: new StringRecordId(thingId),
          now: new Date(),
        },
      );
      if (!result || !result.length) {
        throw new Error("Failed to pin thing");
      }
      const [pins] = result;
      return pins[0];
    } catch (error) {
      console.error("Error pinning thing: ", userId, thingId, error);
      return undefined;
    }
  }

  public static async deletePin(pinId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not initialized");
      }
      const result = await db.query<[IPin[]]>(`DELETE $pinId`, {
        pinId: new StringRecordId(pinId),
      });
      if (!result || !result.length) {
        throw new Error("Failed to delete pin");
      }
      const [pins] = result;
      return pins[0];
    } catch (error) {
      console.error("Error deleting pin: ", pinId, error);
      return undefined;
    }
  }

  public static async unpinThing(
    userId: string | RecordId,
    thingId: string | RecordId,
  ) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not initialized");
      }
      const result = await db.query<[IPin[]]>(
        `DELETE pins WHERE in = $userId AND out = $thingId`,
        {
          thingId: new StringRecordId(thingId),
          userId: new StringRecordId(userId),
        },
      );
      if (!result || !result.length) {
        throw new Error("Failed to unpin thing");
      }
      const [pins] = result;
      return pins[0];
    } catch (error) {
      console.error("Error unpinning thing: ", thingId, userId, error);
      return undefined;
    }
  }

  public static async getUserPins(userId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not initialized");
      }
      const result = await db.query<[IPin[]]>(`SELECT * FROM $userId->pins`, {
        userId: new StringRecordId(userId),
      });
      if (!result || !result.length) {
        throw new Error("Failed to get user pins");
      }
      const [pins] = result;
      return pins;
    } catch (error) {
      console.error("Error getting user pins: ", userId, error);
      return undefined;
    }
  }

  public static async getUserPinnedThings(
    userId: string | RecordId,
  ): Promise<IConnectable[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not initialized");
      }
      const result = await db.query<[IPinnable[]]>(
        `SELECT * OMIT embeddings FROM $userId->pins->(?)`,
        {
          userId: new StringRecordId(userId),
        },
      );
      if (!result || !result.length) {
        throw new Error("Failed to get user pins");
      }
      const [pins] = result;
      const connectables = pins
        .map((p) => {
          const type = Connectable.idToType(p.id.toString());
          if (!type) return null;
          return {
            ...p,
            type,
          } as IConnectable;
        })
        .filter((p) => !!p);
      return connectables;
    } catch (error) {
      console.error("Error getting user pins: ", userId, error);
      return undefined;
    }
  }
}
