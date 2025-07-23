import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../database/db"; // Assuming getDatabase is exported from Twig/app/database/index.ts
import { logger } from "./Logger";

interface CountQueryResult {
  count: number;
}

export interface IHeatmapDataPoint {
  date: string;
  count: number;
}

export class AnalysisService {
  private constructor() {}

  public static async getTotalIdeas(): Promise<number | undefined> {
    const source = "AnalysisService.getTotalIdeas";
    try {
      const db = await getDatabase();
      if (!db) {
        logger.error("Failed to get database instance.", undefined, source);
        return undefined;
      }

      const queryResult = await db.query<[CountQueryResult[]]>(
        "SELECT count() FROM idea GROUP ALL;",
      );

      if (
        queryResult &&
        queryResult.length > 0 &&
        queryResult[0] &&
        queryResult[0].length > 0 &&
        typeof queryResult[0][0].count === "number"
      ) {
        return queryResult[0][0].count;
      } else {
        logger.warn(
          "Unexpected result structure or empty table for total ideas query.",
          { queryResult },
          source,
        );
        return undefined;
      }
    } catch (error: any) {
      logger.error(
        "Error fetching total number of ideas.",
        { error: error.message, stack: error.stack },
        source,
      );
      return undefined;
    }
  }

  public static async getTotalUsers(): Promise<number | undefined> {
    const source = "AnalysisService.getTotalUsers";
    try {
      const db = await getDatabase();
      if (!db) {
        logger.error("Failed to get database instance.", undefined, source);
        return undefined;
      }

      const queryResult = await db.query<[CountQueryResult[]]>(
        "SELECT count() FROM user GROUP ALL;",
      );

      if (
        queryResult &&
        queryResult.length > 0 &&
        queryResult[0] &&
        queryResult[0].length > 0 &&
        typeof queryResult[0][0].count === "number"
      ) {
        return queryResult[0][0].count;
      } else {
        logger.warn(
          "Unexpected result structure or empty table for total users query.",
          { queryResult },
          source,
        );
        return undefined;
      }
    } catch (error: any) {
      logger.error(
        "Error fetching total number of users.",
        { error: error.message, stack: error.stack },
        source,
      );
      return undefined;
    }
  }

  public static async getUserHeatmap(
    userId: string | RecordId,
  ): Promise<IHeatmapDataPoint[] | undefined> {
    const source = "AnalysisService.getTotalUsers";
    try {
      const db = await getDatabase();
      if (!db) {
        logger.error("Failed to get database instance.", undefined, source);
        return undefined;
      }

      const currentYear = new Date().getFullYear();

      const startOfYearStr = `${currentYear}-01-01T00:00:00Z`;
      const endOfYearStr = `${currentYear + 1}-01-01T00:00:00Z`;

      const queryResult = await db.query<[IHeatmapDataPoint[]]>(
        `
          -- Step 2: Select from the subquery's results and format the date.
          SELECT
            time::format(day, '%Y-%m-%d') AS date,
            total AS count
          FROM (
            -- Step 1: Filter and group the raw data first.
            SELECT
              time::floor(createdAt, 1d) AS day,
              count() AS total
            FROM idea
            WHERE
              <-owns<-(user WHERE id = $userId) AND
              createdAt >= $startOfYear AND
              createdAt < $endOfYear
            GROUP BY day
          );
        `,
        {
          userId: userId,
          startOfYear: startOfYearStr,
          endOfYear: endOfYearStr,
        },
      );

      if (!queryResult || !queryResult.length) {
        logger.error(
          "Unexpected result structure or empty table for user heatmap query.",
          { queryResult },
          source,
        );
        return undefined;
      }

      const [heatmapData] = queryResult;
      return heatmapData;
    } catch (error: any) {
      logger.error(
        "Error fetching user heatmap.",
        { error: error.message, stack: error.stack, userId },
        source,
      );
      return undefined;
    }
  }
}
