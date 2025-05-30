import { getDatabase } from "../database/db"; // Assuming getDatabase is exported from Twig/app/database/index.ts
import { logger } from "./Logger";

/**
 * Interface for the result of a COUNT query in SurrealDB.
 * e.g., SELECT count() FROM table GROUP ALL; returns [{ count: N }]
 */
interface CountQueryResult {
  count: number;
}

/**
 * AnalysisService provides static methods for application telemetry and analysis.
 */
export class AnalysisService {
  /**
   * Private constructor to prevent instantiation, as this class only provides static methods.
   */
  private constructor() {}

  /**
   * Gets the total number of ideas in the database.
   * @returns A promise that resolves to the total number of ideas, or undefined if an error occurs.
   */
  public static async getTotalIdeas(): Promise<number | undefined> {
    const source = "AnalysisService.getTotalIdeas";
    try {
      const db = await getDatabase();
      if (!db) {
        logger.error("Failed to get database instance.", undefined, source);
        return undefined;
      }

      // Query to count all records in the 'idea' table.
      // SurrealDB's db.query<[T[]]> returns a structure like [ResultSet[]],
      // where ResultSet is T in this case.
      // For "SELECT count() FROM idea GROUP ALL;", we expect [[{ count: N }]].
      const queryResult = await db.query<[CountQueryResult[]]>(
        "SELECT count() FROM idea GROUP ALL;",
      );

      // Validate the structure of the query result.
      // queryResult should be an array with one element (the result set).
      // queryResult[0] should be an array with one element (the count object).
      if (
        queryResult &&
        queryResult.length > 0 &&
        queryResult[0] &&
        queryResult[0].length > 0 &&
        typeof queryResult[0][0].count === "number"
      ) {
        return queryResult[0][0].count;
      } else {
        // This case handles unexpected query results or if the table is empty and
        // GROUP ALL still behaves unexpectedly (though it should return { count: 0 }).
        // Logging it as a warning as it might indicate an issue or an expected empty state.
        logger.warn(
          "Unexpected result structure or empty table for total ideas query.",
          { queryResult },
          source,
        );
        // If the table is truly empty, count should be 0.
        // If queryResult[0][0] is missing but queryResult[0] exists and is empty, it's ambiguous.
        // However, `SELECT count() ... GROUP ALL` should always return a row, e.g., `[{ count: 0 }]`.
        // So, if we reach here, it's more likely an unexpected format.
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

  /**
   * Gets the total number of users in the database.
   * @returns A promise that resolves to the total number of users, or undefined if an error occurs.
   */
  public static async getTotalUsers(): Promise<number | undefined> {
    const source = "AnalysisService.getTotalUsers";
    try {
      const db = await getDatabase();
      if (!db) {
        logger.error("Failed to get database instance.", undefined, source);
        return undefined;
      }

      // Query to count all records in the 'user' table.
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
}
