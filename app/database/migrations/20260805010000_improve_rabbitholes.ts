import type { Migration } from "./types";

export const migration: Migration = {
  id: "20260805010000_improve_rabbitholes",
  description: "Add Rabbithole workspace metadata and recommendation decision relationships.",
  async up(db) {
    await db.query(`
      DEFINE FIELD IF NOT EXISTS description ON TABLE rabbithole TYPE option<string>;
      DEFINE FIELD IF NOT EXISTS contentSummary ON TABLE rabbithole TYPE option<string>;
      DEFINE FIELD IF NOT EXISTS recommendationPolicy ON TABLE rabbithole TYPE option<object>;
      DEFINE FIELD IF NOT EXISTS recommendationPolicy.mode ON TABLE rabbithole TYPE option<string>;
      DEFINE FIELD IF NOT EXISTS recommendationPolicy.threshold ON TABLE rabbithole TYPE option<number>;
      DEFINE FIELD IF NOT EXISTS recommendationPolicy.types ON TABLE rabbithole TYPE option<array<string>>;

      DEFINE FIELD IF NOT EXISTS origin ON TABLE includes TYPE option<string>;
      DEFINE FIELD IF NOT EXISTS similarity ON TABLE includes TYPE option<number>;
      DEFINE FIELD IF NOT EXISTS reason ON TABLE includes TYPE option<string>;

      DEFINE TABLE IF NOT EXISTS rabbithole_recommends TYPE RELATION SCHEMALESS;
      DEFINE INDEX IF NOT EXISTS rabbithole_recommends_pair_idx
        ON TABLE rabbithole_recommends COLUMNS in, out UNIQUE;

      DEFINE TABLE IF NOT EXISTS rabbithole_excludes TYPE RELATION SCHEMALESS;
      DEFINE INDEX IF NOT EXISTS rabbithole_excludes_pair_idx
        ON TABLE rabbithole_excludes COLUMNS in, out UNIQUE;
    `);
  },
  async down(db) {
    await db.query(`
      REMOVE TABLE rabbithole_excludes;
      REMOVE TABLE rabbithole_recommends;
      REMOVE FIELD reason ON TABLE includes;
      REMOVE FIELD similarity ON TABLE includes;
      REMOVE FIELD origin ON TABLE includes;
      REMOVE FIELD recommendationPolicy ON TABLE rabbithole;
      REMOVE FIELD contentSummary ON TABLE rabbithole;
      REMOVE FIELD description ON TABLE rabbithole;
    `);
  },
};
