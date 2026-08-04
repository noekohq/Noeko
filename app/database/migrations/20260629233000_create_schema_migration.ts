import type { Migration } from "./types";

export const migration: Migration = {
  id: "20260629233000_create_schema_migration",
  description: "Create the schema migration ledger table.",
  async up(db) {
    await db.query(`
      DEFINE TABLE IF NOT EXISTS schema_migration SCHEMAFULL;
      DEFINE FIELD IF NOT EXISTS migrationId ON TABLE schema_migration TYPE string;
      DEFINE FIELD IF NOT EXISTS checksum ON TABLE schema_migration TYPE string;
      DEFINE FIELD IF NOT EXISTS description ON TABLE schema_migration TYPE option<string>;
      DEFINE FIELD IF NOT EXISTS appliedAt ON TABLE schema_migration TYPE datetime;
      DEFINE FIELD IF NOT EXISTS durationMs ON TABLE schema_migration TYPE number;
      DEFINE FIELD IF NOT EXISTS appVersion ON TABLE schema_migration TYPE option<string>;
      DEFINE INDEX IF NOT EXISTS schema_migration_id_idx
        ON TABLE schema_migration COLUMNS migrationId UNIQUE;
    `);
  },
  async down() {
    throw new Error("The schema migration ledger cannot be rolled back automatically.");
  },
};
