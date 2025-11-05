import { getDatabase } from "../db";
import { IFinding, IFindingType } from "../../services/Spyglass";
import { StringRecordId } from "surrealdb";

export interface ISpyglassRecord {
  id: StringRecordId;
  userId: StringRecordId;
  createdAt: Date;
  baseQuery: string;
  scope: StringRecordId[];
  searchPerformed: boolean;
  isDeepAnalysis: boolean;
  findings?: IFinding[];
  overview: string;
}

export interface ISpyglassRecordCreator
  extends Omit<ISpyglassRecord, "id" | "createdAt" | "userId"> {}

export class SpyglassRecord {
  public static table = "spyglass_record";

  public static async create(
    userId: string,
    data: ISpyglassRecordCreator,
  ): Promise<ISpyglassRecord | null> {
    try {
      const {
        baseQuery,
        scope,
        searchPerformed,
        isDeepAnalysis,
        findings,
        overview,
      } = data;

      const query = `
        CREATE ${this.table} CONTENT {
          userId: type::thing('user', $userId),
          createdAt: time::now(),
          baseQuery: $baseQuery,
          scope: $scope,
          searchPerformed: $searchPerformed,
          isDeepAnalysis: $isDeepAnalysis,
          findings: $findings,
          overview: $overview
        };
      `;

      const db = await getDatabase();
      if (!db) {
        throw new Error("Database connection not available");
      }

      const result = await db.query<[ISpyglassRecord[]]>(query, {
        userId,
        baseQuery,
        scope,
        searchPerformed,
        isDeepAnalysis,
        findings: findings || [],
        overview,
      });

      if (result && result.length > 0 && result[0].length > 0) {
        return result[0][0];
      }
      return null;
    } catch (error) {
      console.error("Error creating SpyglassRecord:", error);
      return null;
    }
  }
}
