import type { Migration } from "./types";
import { defineAutomationSchema, removeAutomationSchema } from "../models/automation_schema";

export const migration: Migration = {
  id: "20260803200000_add_automation",
  description: "Add API credentials, durable domain events, and webhook delivery.",
  async up(db) {
    await db.query(defineAutomationSchema);
  },
  async down(db) {
    await db.query(removeAutomationSchema);
  },
};
