import Surreal from "surrealdb";
import { seedDatabase } from "./init";

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
  const config = {
    protocol: DB_PROTOCOL,
    host: DB_HOST, // This will now get the LATEST value
    port: DB_PORT,
    namespace: DB_NAMESPACE,
    database: DB_DATABASE,
    user: DB_USER,
    password: DB_PASSWORD,
  };

  // Perform crucial checks just before attempting to use them
  if (!config.protocol)
    throw new Error(
      "DB_PROTOCOL is not defined in process.env at connection time",
    );
  if (!config.host)
    throw new Error("DB_HOST is not defined in process.env at connection time");
  if (!config.port)
    throw new Error("DB_PORT is not defined in process.env at connection time");
  if (!config.namespace)
    throw new Error(
      "DB_NAMESPACE is not defined in process.env at connection time",
    );
  if (!config.database)
    throw new Error(
      "DB_DATABASE is not defined in process.env at connection time",
    );
  if (!config.user)
    throw new Error("DB_USER is not defined in process.env at connection time");
  if (!config.password)
    throw new Error(
      "DB_PASSWORD is not defined in process.env at connection time",
    );

  return {
    ...(config as Record<keyof typeof config, string>),
    connectionString: `${config.protocol}://${config.host}:${config.port}`,
  };
};

const getConnectionString = () => {
  const { protocol, host, port } = getDbConfig();
  return `${protocol}://${host}:${port}`;
};

export const getDatabase = async () => {
  const db = new Surreal();
  try {
    console.info("Attempting to connect to database...");
    const config = getDbConfig();
    if (!config) {
      return;
    }
    const { user, password, namespace, database } = config;
    await db.connect(getConnectionString(), {
      auth: {
        username: user,
        password: password,
      },
    });
    await db.ready;

    await db.use({
      namespace: namespace,
      database: database,
    });
    console.info(
      `Connected to database ${database} in namespace ${namespace}.`,
    );

    return db;
  } catch (err) {
    console.error(err);
    return undefined;
  }
};

export const initSchema = async () => {
  try {
    const db = await getDatabase();
    const config = getDbConfig();

    await db?.query(`DEFINE NAMESPACE IF NOT EXISTS ${config.namespace};`);
    await db?.use({
      namespace: config.namespace,
    });
    await db?.query(`DEFINE DATABASE IF NOT EXISTS ${config.database};`);

    console.info(
      `Initialized ${config.database} in namespace ${config.namespace}.`,
    );
  } catch (err) {
    console.error(err);
  }
};

export const initDatabase = async () => {
  await initSchema();
  await seedDatabase();
};
