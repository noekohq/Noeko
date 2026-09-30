export {};

const database = process.env.DB_DATABASE;
if (!database?.endsWith("_test")) {
  throw new Error(
    `Refusing to launch live Spyglass tests against "${database ?? "<undefined>"}". ` +
      "DB_DATABASE must end in _test."
  );
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY must be set in .env before running live Spyglass tests.");
}

const child = Bun.spawn(
  [
    "bun",
    "test",
    "--test-sequential",
    "integration/spyglass/spyglass.live.test.ts",
    ...process.argv.slice(2),
  ],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      LM_PROVIDER: "openai",
      EMBEDDINGS_PROVIDER: "openai",
      EMBEDDINGS_MODEL: process.env.SPYGLASS_LIVE_EMBEDDINGS_MODEL ?? "text-embedding-3-small",
      EMBEDDINGS_DIMENSION: process.env.SPYGLASS_LIVE_EMBEDDINGS_DIMENSION ?? "768",
    },
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  }
);

const exitCode = await child.exited;
process.exit(exitCode);
