import { createHash } from "node:crypto";
import type Surreal from "surrealdb";
import { migrations } from ".";
import type { Migration, MigrationRecord } from "./types";

type MigrationStatus = {
  id: string;
  description: string;
  applied: boolean;
  checksum: string;
  appliedAt?: Date | string;
};

const checksumMigration = (migration: Migration) => {
  return createHash("sha256")
    .update(migration.id)
    .update(migration.description)
    .update(migration.up.toString())
    .update(migration.down.toString())
    .digest("hex");
};

const getAppVersion = () => {
  return process.env.npm_package_version ?? null;
};

const getAppliedMigrations = async (db: Surreal): Promise<MigrationRecord[]> => {
  try {
    const [records = []] = await db.query<[MigrationRecord[]]>(
      "SELECT migrationId, checksum, description, appliedAt, durationMs, appVersion FROM schema_migration ORDER BY migrationId ASC;"
    );
    return records;
  } catch (error) {
    console.info("No migration ledger found yet; starting from an empty migration history.");
    return [];
  }
};

const getAppliedMigrationMap = async (db: Surreal) => {
  const applied = await getAppliedMigrations(db);
  return new Map(applied.map((record) => [record.migrationId, record]));
};

const validateMigrationList = () => {
  const seen = new Set<string>();
  for (const migration of migrations) {
    if (seen.has(migration.id)) {
      throw new Error(`Duplicate migration id found: ${migration.id}`);
    }
    seen.add(migration.id);
  }
};

const recordMigration = async (db: Surreal, migration: Migration, durationMs: number) => {
  const appVersion = getAppVersion();
  const appVersionField = appVersion ? ", appVersion: $appVersion" : "";
  await db.query(
    `
      CREATE schema_migration CONTENT {
        migrationId: $migrationId,
        checksum: $checksum,
        description: $description,
        appliedAt: time::now(),
        durationMs: $durationMs
        ${appVersionField}
      };
    `,
    {
      migrationId: migration.id,
      checksum: checksumMigration(migration),
      description: migration.description,
      durationMs,
      ...(appVersion ? { appVersion } : {}),
    }
  );
};

const removeMigrationRecord = async (db: Surreal, migration: Migration) => {
  await db.query("DELETE schema_migration WHERE migrationId = $migrationId;", {
    migrationId: migration.id,
  });
};

export const getMigrationStatus = async (db: Surreal): Promise<MigrationStatus[]> => {
  validateMigrationList();
  const applied = await getAppliedMigrationMap(db);

  return migrations.map((migration) => {
    const record = applied.get(migration.id);
    const checksum = checksumMigration(migration);
    return {
      id: migration.id,
      description: migration.description,
      applied: !!record,
      checksum,
      appliedAt: record?.appliedAt,
    };
  });
};

export const runMigrations = async (db: Surreal) => {
  validateMigrationList();
  const applied = await getAppliedMigrationMap(db);

  for (const migration of migrations) {
    const checksum = checksumMigration(migration);
    const existing = applied.get(migration.id);

    if (existing) {
      if (existing.checksum !== checksum) {
        throw new Error(
          `Migration checksum mismatch for ${migration.id}. The migration was changed after it was applied.`
        );
      }
      continue;
    }

    const startedAt = Date.now();
    console.info(`Applying migration ${migration.id}: ${migration.description}`);
    await migration.up(db);
    await recordMigration(db, migration, Date.now() - startedAt);
  }

  console.info("Database migrations are up to date.");
};

export const rollbackMigrations = async (db: Surreal, steps = 1) => {
  validateMigrationList();
  if (!Number.isInteger(steps) || steps < 1) {
    throw new Error(`Rollback steps must be a positive integer. Received: ${steps}`);
  }

  const appliedRecords = await getAppliedMigrations(db);
  const migrationById = new Map(migrations.map((migration) => [migration.id, migration]));
  const rollbackRecords = appliedRecords.slice().reverse().slice(0, steps);

  if (rollbackRecords.length === 0) {
    console.info("No applied migrations to roll back.");
    return;
  }

  for (const record of rollbackRecords) {
    const migration = migrationById.get(record.migrationId);
    if (!migration) {
      throw new Error(`Applied migration ${record.migrationId} does not exist in local code.`);
    }

    console.info(`Rolling back migration ${migration.id}: ${migration.description}`);
    await migration.down(db);
    await removeMigrationRecord(db, migration);
  }
};
