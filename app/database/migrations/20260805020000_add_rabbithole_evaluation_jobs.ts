import type { Migration } from "./types";

export const migration: Migration = {
  id: "20260805020000_add_rabbithole_evaluation_jobs",
  description: "Persist reactive Rabbithole evaluation work independently of client requests.",
  async up(db) {
    await db.query(`
      DEFINE TABLE IF NOT EXISTS rabbithole_evaluation_job SCHEMALESS;
      DEFINE INDEX IF NOT EXISTS rabbithole_evaluation_job_status_lease_idx
        ON TABLE rabbithole_evaluation_job COLUMNS status, leaseExpiresAt;
      DEFINE INDEX IF NOT EXISTS rabbithole_evaluation_job_available_idx
        ON TABLE rabbithole_evaluation_job COLUMNS status, availableAt;
    `);
  },
  async down(db) {
    await db.query(`REMOVE TABLE rabbithole_evaluation_job;`);
  },
};
