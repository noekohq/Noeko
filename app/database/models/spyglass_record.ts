import { getDatabase } from "../db";
import {
  IFinding,
  IFindingType,
  ISpyglassIntent,
} from "../../services/Spyglass";
import { RecordId, StringRecordId } from "surrealdb";

export type ISpyglassRecord = {
  id: StringRecordId;
  createdAt: Date;
  intent?: ISpyglassIntent;
  baseQuery: string;
  scope: StringRecordId[];
  searchPerformed: boolean;
  isDeepAnalysis: boolean;
  findings?: IFinding[];
  overview: string;
};

export type ISpyglassRecordForm = Omit<ISpyglassRecord, "id" | "createdAt">;
export type ISpyglassRecordCreator = Omit<ISpyglassRecord, "id">;

export type ISpyglassHistoryResponse = {
  history: ISpyglassRecord[];
  total: number;
  limit: number;
  page: number;
};

export type ISpyglassLightHistoryResponse = {
  history: Pick<ISpyglassRecord, "id" | "baseQuery" | "createdAt">[];
  total: number;
  limit: number;
  page: number;
};

export class SpyglassRecord {
  public static table = "spyglass_record";

  public static async create(
    userId: string | RecordId,
    data: ISpyglassRecordCreator,
  ): Promise<ISpyglassRecord | null> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database connection not available");
      }

      const result = await db.create<ISpyglassRecord, ISpyglassRecordCreator>(
        "spyglass_record",
        {
          intent: data.intent,
          baseQuery: data.baseQuery,
          scope: data.scope,
          searchPerformed: data.searchPerformed,
          isDeepAnalysis: data.isDeepAnalysis,
          findings: data.findings,
          overview: data.overview,
          createdAt: new Date(),
        },
      );

      if (!result || !result[0]) {
        return null;
      }

      const record = result[0];

      await db.query(
        `RELATE $userId->owns->$recordId CONTENT {
        createdAt: $now
      };`,
        {
          userId,
          recordId: new StringRecordId(record.id),
          now: new Date(),
        },
      );

      return record;
    } catch (error) {
      console.error("Error creating SpyglassRecord:", error);
      return null;
    }
  }

  public static async getById(id: string): Promise<ISpyglassRecord | null> {
    try {
      const query = `
        SELECT * FROM ${this.table} WHERE id = $id;
      `;

      const db = await getDatabase();
      if (!db) {
        throw new Error("Database connection not available");
      }

      const result = await db.query<[ISpyglassRecord[]]>(query, {
        id: new StringRecordId(id),
      });

      if (result && result.length > 0 && result[0].length > 0) {
        return result[0][0];
      }
      return null;
    } catch (error) {
      console.error("Error getting SpyglassRecord by ID:", error);
      return null;
    }
  }

  public static async checkUserOwnership(
    recordId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database connection not available");
      }

      const result = await db.query<[ISpyglassRecord[]]>(
        `SELECT id FROM ${this.table} WHERE id = $recordId AND <-owns<-(user WHERE id = $userId);`,
        {
          recordId,
          userId,
        },
      );

      return result?.[0]?.length > 0;
    } catch (error) {
      console.error("Error in checkUserOwnership:", error);
      return false;
    }
  }

  public static async getHistory(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<ISpyglassHistoryResponse | null> {
    try {
      const offset = (page > 0 ? page - 1 : 0) * pageSize;
      const limit = pageSize;

      const db = await getDatabase();
      if (!db) {
        throw new Error("Database connection not available");
      }

      const historyQuery = `
        SELECT * FROM ${this.table}
        WHERE <-searched<-(user WHERE id = $userId)
        ORDER BY createdAt DESC
        LIMIT $limit START $offset;
      `;
      const historyResult = await db.query<[ISpyglassRecord[]]>(historyQuery, {
        userId,
        limit,
        offset,
      });

      const countQuery = `
        SELECT count((SELECT * FROM ${this.table} WHERE <-searched<-(user WHERE id = $userId))) as total;
      `;
      const countResult = await db.query<[{ total: number }[]]>(countQuery, {
        userId,
      });

      const history = historyResult?.[0] || [];
      const total = countResult?.[0]?.total || 0;

      return {
        history,
        total,
        limit,
        page,
      };
    } catch (error) {
      console.error("Error getting SpyglassRecord history:", error);
      return null;
    }
  }

  public static async getHistoryLightweight(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<ISpyglassLightHistoryResponse | null> {
    try {
      const offset = (page > 0 ? page - 1 : 0) * pageSize;
      const limit = pageSize;

      const db = await getDatabase();
      if (!db) {
        throw new Error("Database connection not available");
      }

      const historyQuery = `
        SELECT id, baseQuery, createdAt FROM ${this.table}
        WHERE <-owns<-(user WHERE id = $userId)
        ORDER BY createdAt DESC
        LIMIT $limit START $offset
      `;
      const historyResult = await db.query<
        [Pick<ISpyglassRecord, "id" | "baseQuery" | "createdAt">[]]
      >(historyQuery, {
        userId,
        limit,
        offset,
      });

      const countQuery = `
        SELECT VALUE
            count(
                ->owns->spyglass_record
            )
        FROM $userId;
      `;
      const countResult = await db.query<[number[]]>(countQuery, {
        userId: new StringRecordId(userId),
      });

      const history = historyResult?.[0] || [];
      const total = countResult?.[0][0] || 0;

      return {
        history,
        total,
        limit,
        page,
      };
    } catch (error) {
      console.error("Error getting SpyglassRecord history lightweight:", error);
      return null;
    }
  }
}
