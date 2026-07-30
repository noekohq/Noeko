import type { Migration } from "./types";
import { defineSpyglassRunSchema, removeSpyglassRunSchema } from "../models/spyglass_run_schema";

export const migration: Migration = {
  id: "20260728120000_add_spyglass_runs",
  description: "Add durable Spyglass runs, event replay, and worker leasing.",
  async up(db) {
    await db.query(defineSpyglassRunSchema);
  },
  async down(db) {
    await db.query(removeSpyglassRunSchema);
  },
};
