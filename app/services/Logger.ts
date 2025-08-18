import { Log, ILogForm, ILog } from "../database/models/log";

/**
 * LoggingService provides a singleton interface for creating log entries
 * using the Log model. It offers methods for different log levels.
 */
export class LoggingService {
  private static instance: LoggingService;

  /**
   * Private constructor to enforce singleton pattern.
   */
  private constructor() {}

  /**
   * Gets the singleton instance of the LoggingService.
   * @returns The singleton instance of LoggingService.
   */
  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  /**
   * Generic method to create a log entry.
   * @param level - The severity level of the log.
   * @param message - The main log message.
   * @param context - Optional. Additional structured data for the log.
   * @param source - Optional. The source of the log entry (e.g., 'UserService', 'API').
   * @returns A promise that resolves to the created log entry or undefined if an error occurs.
   */
  private async createLogEntry(
    level: ILog["level"],
    message: string,
    context?: Record<string, any>,
    source?: string,
  ): Promise<ILog | undefined> {
    const logForm: ILogForm = {
      level,
      message,
      context,
      source,
    };

    console.info(
      `[${level.toUpperCase()}] Message: ${message}${source ? ` | Source: ${source}` : ""}.`,
      context,
    );

    try {
      const createdLog = await Log.create(logForm);
      if (!createdLog) {
        // Fallback to console logging if database logging fails
        console.error(
          `[DB Log Failed - ${level.toUpperCase()}] Message: ${message}${source ? ` | Source: ${source}` : ""}${context ? ` | Context: ${JSON.stringify(context)}` : ""}`,
        );
      }
      return createdLog;
    } catch (error) {
      // Fallback for unexpected errors during the Log.create call
      console.error(
        `[DB Log Exception - ${level.toUpperCase()}] Message: ${message}${source ? ` | Source: ${source}` : ""}${context ? ` | Context: ${JSON.stringify(context)}` : ""}`,
        error,
      );
      return undefined;
    }
  }

  /**
   * Logs an informational message.
   * @param message - The main log message.
   * @param context - Optional. Additional structured data for the log.
   * @param source - Optional. The source of the log entry.
   * @returns A promise that resolves to the created log entry or undefined.
   */
  public async info(
    message: string,
    context?: Record<string, any>,
    source?: string,
  ): Promise<ILog | undefined> {
    return this.createLogEntry("info", message, context, source);
  }

  /**
   * Logs a warning message.
   * @param message - The main log message.
   * @param context - Optional. Additional structured data for the log.
   * @param source - Optional. The source of the log entry.
   * @returns A promise that resolves to the created log entry or undefined.
   */
  public async warn(
    message: string,
    context?: Record<string, any>,
    source?: string,
  ): Promise<ILog | undefined> {
    return this.createLogEntry("warn", message, context, source);
  }

  /**
   * Logs an error message.
   * @param message - The main log message.
   * @param context - Optional. Additional structured data for the log (e.g., error stack, request details).
   * @param source - Optional. The source of the log entry.
   * @returns A promise that resolves to the created log entry or undefined.
   */
  public async error(
    message: string,
    context?: Record<string, any>,
    source?: string,
  ): Promise<ILog | undefined> {
    return this.createLogEntry("error", message, context, source);
  }

  /**
   * Logs a debug message.
   * @param message - The main log message.
   * @param context - Optional. Additional structured data for the log.
   * @param source - Optional. The source of the log entry.
   * @returns A promise that resolves to the created log entry or undefined.
   */
  public async debug(
    message: string,
    context?: Record<string, any>,
    source?: string,
  ): Promise<ILog | undefined> {
    return this.createLogEntry("debug", message, context, source);
  }

  /**
   * Logs a verbose message.
   * @param message - The main log message.
   * @param context - Optional. Additional structured data for the log.
   * @param source - Optional. The source of the log entry.
   * @returns A promise that resolves to the created log entry or undefined.
   */
  public async verbose(
    message: string,
    context?: Record<string, any>,
    source?: string,
  ): Promise<ILog | undefined> {
    return this.createLogEntry("verbose", message, context, source);
  }
}

/**
 * Export a pre-initialized singleton instance of the LoggingService for easy consumption.
 */
export const logger = LoggingService.getInstance();
