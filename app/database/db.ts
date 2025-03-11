import Surreal from "surrealdb";

const {
  DB_PROTOCOL,
  DB_HOST,
  DB_PORT,
  DB_NAMESPACE,
  DB_DATABASE,
  DB_USER,
  DB_PASSWORD,
} = process.env;

if (!DB_PROTOCOL) {
  throw new Error("DB_PROTOCOL is not defined");
}

if (!DB_HOST) {
  throw new Error("DB_HOST is not defined");
}

if (!DB_PORT) {
  throw new Error("DB_PORT is not defined");
}

if (!DB_NAMESPACE) {
  throw new Error("DB_NAMESPACE is not defined");
}

if (!DB_DATABASE) {
  throw new Error("DB_DATABASE is not defined");
}

if (!DB_USER) {
  throw new Error("DB_USER is not defined");
}

if (!DB_PASSWORD) {
  throw new Error("DB_PASSWORD is not defined");
}

type IDatabase = {
  db: Surreal | undefined;
};

export const Database: IDatabase = {
  db: undefined,
};

export const initConnection = async () => {
  const db = new Surreal();

  try {
    const connectionString = `${DB_PROTOCOL}://${DB_HOST}:${DB_PORT}`;
    await db.connect(connectionString, {
      auth: {
        username: DB_USER,
        password: DB_PASSWORD,
      },
    });
    await db.ready;
    await db.use({
      namespace: DB_NAMESPACE,
      database: DB_DATABASE,
    });
    Database.db = db;
    console.info(`Connected to database at ${connectionString}`);
  } catch (err) {
    console.error(err);
  }
};

export const initSchema = async () => {
  await Database.db?.ready;
  try {
    await Database.db?.query(`DEFINE NAMESPACE IF NOT EXISTS ${DB_NAMESPACE};`);
    await Database.db?.query(`DEFINE DATABASE IF NOT EXISTS ${DB_DATABASE};`);

    console.info(`Initialized ${DB_DATABASE} in namespace ${DB_NAMESPACE}.`);
  } catch (err) {
    console.error(err);
  }
};

export const initDatabase = async () => {
  await initConnection();
  await initSchema();
};
