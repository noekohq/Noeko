import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../db";

/**
 * Defines the structure of a log record in the database.
 */
export type ILog = {
  id: RecordId | string;
  level: "info" | "warn" | "error" | "debug" | "verbose" | "event";
  message: string;
  context?: Record<string, any>; // For additional structured data
  source?: string; // e.g., 'UserService', 'IdeaModel', 'APIRequest'
  createdAt: Date;
  updatedAt: Date; // Though logs are typically immutable, included for consistency
};

/**
 * Defines the structure for creating a new log entry.
 * Omits system-generated fields like id, createdAt, and updatedAt.
 */
export type ILogForm = Omit<ILog, "id" | "createdAt" | "updatedAt">;

/**
 * The Log class provides static methods for interacting with log entries in the database.
 */
export class Log {
  private static readonly TABLE_NAME = "log";

  constructor() {}

  /**
   * Placeholder for database-specific schema setup or function definitions.
   * Called during application initialization.
   */
  static async up() {
    // No specific setup required for a simple log table initially.
    // This can be expanded later if needed (e.g., defining indexes).
    // console.info("Log model up function executed.");
    return Promise.resolve();
  }

  /**
   * Creates a new log entry in the database.
   * @param form - The data for the new log entry.
   * @returns The created log record or undefined if an error occurs.
   */
  static async create(form: ILogForm): Promise<ILog | undefined> {
    const db = await getDatabase();
    if (!db) {
      console.error("Database connection not available for creating log.");
      return undefined;
    }

    try {
      const now = new Date();
      const logData: Omit<ILog, "id"> = {
        ...form,
        createdAt: now,
        updatedAt: now,
      };

      const result = await db.create<ILog, Omit<ILog, "id">>(this.TABLE_NAME, logData);
      if (result && result.length > 0) {
        return result[0];
      }
      return undefined;
    } catch (error) {
      console.error(`Error creating log:`, error);
      return undefined;
    }
  }

  /**
   * Retrieves a single log record by its ID.
   * @param id - The ID of the log record to retrieve.
   * @returns The log record or undefined if not found or an error occurs.
   */
  static async get(id: string | RecordId): Promise<ILog | undefined> {
    const db = await getDatabase();
    if (!db) {
      console.error("Database connection not available for getting log.");
      return undefined;
    }

    try {
      const recordId = typeof id === "string" ? new StringRecordId(id) : id;
      const result = await db.select<ILog>(recordId);
      return result ?? undefined; // SurrealDB client might return null if not found
    } catch (error) {
      console.error(`Error retrieving log with ID ${id}:`, error);
      return undefined;
    }
  }

  /**
   * Retrieves all log records from the database.
   * Potentially, this could be extended with pagination or filtering in the future.
   * @returns An array of log records or undefined if an error occurs.
   */
  static async getAll(): Promise<ILog[] | undefined> {
    const db = await getDatabase();
    if (!db) {
      console.error("Database connection not available for getting all logs.");
      return undefined;
    }

    try {
      const logs = await db.select<ILog>(this.TABLE_NAME);
      return logs ?? []; // Ensure an array is returned even if DB returns null/undefined
    } catch (error) {
      console.error("Error retrieving all logs:", error);
      return undefined;
    }
  }
}
