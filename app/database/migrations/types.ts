import type { AppDatabase } from "../surreal";

export type MigrationDirection = "up" | "down";

export type Migration = {
  id: string;
  description: string;
  up: (db: AppDatabase) => Promise<void>;
  down: (db: AppDatabase) => Promise<void>;
};

export type MigrationRecord = {
  migrationId: string;
  checksum: string;
  description?: string | null;
  appliedAt: Date | string;
  durationMs: number;
  appVersion?: string | null;
};
