import Surreal from "surrealdb";

const { DB_URL } = process.env;

if (!DB_URL) {
  throw new Error("DB_URL is not defined");
}

const db = new Surreal();

const init = async () => {
  await db.connect(DB_URL);
  await db.use({
    namespace: "twig",
    database: "twig",
  });
};

await init();
