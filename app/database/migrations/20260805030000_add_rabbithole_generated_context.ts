import type { Migration } from "./types";

export const migration: Migration = {
  id: "20260805030000_add_rabbithole_generated_context",
  description: "Track AI-generated Rabbithole titles and descriptions.",
  async up(db) {
    await db.query(`
      DEFINE FIELD IF NOT EXISTS nameGeneratedAt ON TABLE rabbithole TYPE option<datetime>;
      DEFINE FIELD IF NOT EXISTS descriptionGeneratedAt ON TABLE rabbithole TYPE option<datetime>;
    `);
  },
  async down(db) {
    await db.query(`
      REMOVE FIELD descriptionGeneratedAt ON TABLE rabbithole;
      REMOVE FIELD nameGeneratedAt ON TABLE rabbithole;
    `);
  },
};
