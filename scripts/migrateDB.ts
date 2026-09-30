import { parseArgs } from "node:util";
import { closeDatabaseConnection, getDatabase } from "../app/database/db";
import {
  getMigrationStatus,
  rollbackMigrations,
  runMigrations,
} from "../app/database/migrations/runner";

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: {
    help: {
      type: "boolean",
      short: "h",
    },
    steps: {
      type: "string",
      short: "s",
    },
  },
});

const printHelp = () => {
  console.info("Usage:");
  console.info("  bun run scripts/migrateDB.ts up");
  console.info("  bun run scripts/migrateDB.ts status");
  console.info("  bun run scripts/migrateDB.ts rollback --steps 1");
};

if (values.help) {
  printHelp();
  process.exit(0);
}

const action = positionals[0] ?? "up";

try {
  const db = await getDatabase();
  if (!db) {
    throw new Error("Could not connect to the database.");
  }

  if (action === "up") {
    await runMigrations(db);
  } else if (action === "rollback" || action === "down") {
    await rollbackMigrations(db, Number(values.steps ?? 1));
  } else if (action === "status") {
    const statuses = await getMigrationStatus(db);
    for (const status of statuses) {
      const marker = status.applied ? "applied" : "pending";
      const appliedAt = status.appliedAt ? ` at ${new Date(status.appliedAt).toISOString()}` : "";
      console.info(`${marker.padEnd(7)} ${status.id}${appliedAt} - ${status.description}`);
    }
  } else {
    printHelp();
    throw new Error(`Unknown migration action: ${action}`);
  }
} catch (error) {
  console.error("Migration command failed:", error);
  process.exitCode = 1;
} finally {
  await closeDatabaseConnection();
}
