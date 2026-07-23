import type { Migration } from "./types";

export const migration: Migration = {
  id: "20260629233100_add_schema_migration_metadata",
  description: "Add optional metadata storage to migration records.",
  async up(db) {
    await db.query(`
      DEFINE FIELD IF NOT EXISTS metadata ON TABLE schema_migration TYPE option<object>;
    `);
  },
  async down(db) {
    await db.query(`
      REMOVE FIELD metadata ON TABLE schema_migration;
    `);
  },
};
