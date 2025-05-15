import Surreal, { ConnectionStatus } from "surrealdb"; // Make sure to import ConnectionStatus
import { seedDatabase } from "./init"; // Assuming this file exists and is correct

type IDatabase = {
  db: Surreal | undefined;
};

export const Database: IDatabase = {
  db: undefined,
};

const getDbConfig = () => {
  // Read directly from process.env EACH time this function is called
  const {
    DB_PROTOCOL,
    DB_HOST,
    DB_PORT,
    DB_NAMESPACE,
    DB_DATABASE,
    DB_USER,
    DB_PASSWORD,
  } = process.env;

  const configValues = {
    DB_PROTOCOL,
    DB_HOST,
    DB_PORT,
    DB_NAMESPACE,
    DB_DATABASE,
    DB_USER,
    DB_PASSWORD,
  };

  // Perform crucial checks
  for (const [key, value] of Object.entries(configValues)) {
    if (!value) {
      throw new Error(
        `${key} is not defined in process.env at connection time`,
      );
    }
  }

  // All values are confirmed to be strings (as process.env values are strings or undefined)
  return {
    protocol: DB_PROTOCOL!,
    host: DB_HOST!,
    port: DB_PORT!,
    namespace: DB_NAMESPACE!,
    database: DB_DATABASE!,
    user: DB_USER!,
    password: DB_PASSWORD!,
    connectionString: `${DB_PROTOCOL}://${DB_HOST}:${DB_PORT}`,
  };
};

export const getDatabase = async (): Promise<Surreal | undefined> => {
  // Check if an instance exists and is properly connected
  if (
    Database.db &&
    Database.db.status === ConnectionStatus.Connected &&
    (await Database.db.info())
  ) {
    console.info("Reusing existing and connected database instance.");
    return Database.db;
  }

  // If an instance exists but is not connected (e.g., disconnected, connecting, disconnecting),
  // attempt to close it before creating a new one.
  if (Database.db) {
    console.warn(
      `Existing database instance found with status: ${Database.db.status}. Closing and attempting to reconnect.`,
    );
    try {
      await Database.db.close();
    } catch (closeError) {
      // Log error, but proceed to attempt reconnection
      console.error("Error closing stale database connection:", closeError);
    }
    Database.db = undefined; // Clear the stale instance
  }

  console.info("Attempting to establish a new database connection...");
  const newDbInstance = new Surreal();
  try {
    const config = getDbConfig(); // Reads env vars each time, as per original design
    const { user, password, namespace, database, connectionString } = config;

    // The connect method waits for the connection to be established.
    await newDbInstance.connect(connectionString, {
      auth: {
        username: user,
        password: password,
      },
    });

    // Use the specified namespace and database
    await newDbInstance.use({
      namespace: namespace,
      database: database,
    });

    console.info(
      `Successfully connected to database ${database} in namespace ${namespace}. Storing instance.`,
    );

    Database.db = newDbInstance; // Store the new, successfully connected and configured instance
    return Database.db;
  } catch (err) {
    console.error("Failed to connect to the database:", err);
    // If newDbInstance was created and might be in a partially connected state, try to close it.
    if (
      newDbInstance.status &&
      newDbInstance.status !== ConnectionStatus.Error &&
      newDbInstance.status !== ConnectionStatus.Disconnected
    ) {
      try {
        await newDbInstance.close();
        console.info(
          "Closed partially opened database instance after connection failure.",
        );
      } catch (closeErr) {
        console.error(
          "Error closing newDbInstance after connection failure:",
          closeErr,
        );
      }
    }
    // Ensure the global Database.db is not set to a failed instance
    if (Database.db === newDbInstance) {
      Database.db = undefined;
    }
    return undefined;
  }
};

export const initSchema = async () => {
  try {
    const db = await getDatabase(); // This will now use the singleton
    if (!db) {
      const errorMsg =
        "Failed to initialize schema: Database connection not available.";
      console.error(errorMsg);
      // Optionally, throw an error to halt further execution if schema is critical
      throw new Error(errorMsg);
    }

    const config = getDbConfig(); // Get config for defining namespace/database names

    // DEFINE NAMESPACE is a global operation, not strictly tied to current 'USE'd NS, but good practice.
    await db.query(`DEFINE NAMESPACE IF NOT EXISTS ${config.namespace};`);

    // Ensure we are using the correct namespace before defining the database within it,
    // though getDatabase() should have already set it. This is a safeguard.
    await db.use({
      namespace: config.namespace,
      // database: config.database, // Not strictly necessary for DEFINE DATABASE if NS is set
    });
    await db.query(`DEFINE DATABASE IF NOT EXISTS ${config.database};`);

    // Switch to the newly defined/confirmed database and namespace for subsequent operations if needed
    await db.use({
      namespace: config.namespace,
      database: config.database,
    });

    console.info(
      `Schema initialized (or ensured) for database ${config.database} in namespace ${config.namespace}.`,
    );
  } catch (err) {
    console.error("Error during schema initialization:", err);
    // Rethrow or handle as appropriate for your application
    // throw err;
  }
};

export const initDatabase = async () => {
  await initSchema();
  // seedDatabase ideally should also use getDatabase() or be passed the db instance
  await seedDatabase(); // Ensure seedDatabase() is adapted if it directly creates connections
};

// Optional: Add a function to gracefully close the connection on application shutdown
export const closeDatabaseConnection = async () => {
  if (Database.db) {
    console.info("Attempting to close database connection...");
    try {
      await Database.db.close();
      Database.db = undefined;
      console.info("Database connection closed successfully.");
    } catch (err) {
      console.error("Error closing database connection:", err);
    }
  }
};
