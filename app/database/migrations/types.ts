import type Surreal from "surrealdb";

export type MigrationDirection = "up" | "down";

export type Migration = {
  id: string;
  description: string;
  up: (db: Surreal) => Promise<void>;
  down: (db: Surreal) => Promise<void>;
};

export type MigrationRecord = {
  migrationId: string;
  checksum: string;
  description?: string | null;
  appliedAt: Date | string;
  durationMs: number;
  appVersion?: string | null;
};
