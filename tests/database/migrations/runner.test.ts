import { describe, expect, it, vi } from "vitest";
import { AppDatabase } from "../../../app/database/surreal";
import { migrations } from "../../../app/database/migrations";
import { checksumMigration, getMigrationStatus } from "../../../app/database/migrations/runner";

const migrationRecord = (checksum: string) => ({
  migrationId: migrations[0].id,
  checksum,
  description: migrations[0].description,
  appliedAt: new Date("2026-07-30T00:00:00.000Z"),
  durationMs: 10,
});

describe("migration status", () => {
  it("reports an applied migration whose checksum no longer matches", async () => {
    const db = {
      query: vi.fn(async () => [[migrationRecord("modified-checksum")]]),
    } as unknown as AppDatabase;

    const statuses = await getMigrationStatus(db);
    const status = statuses.find(({ id }) => id === migrations[0].id);

    expect(status).toMatchObject({
      applied: true,
      storedChecksum: "modified-checksum",
      checksumMatches: false,
    });
  });

  it("reports a matching applied migration as valid", async () => {
    const checksum = checksumMigration(migrations[0]);
    const db = {
      query: vi.fn(async () => [[migrationRecord(checksum)]]),
    } as unknown as AppDatabase;

    const statuses = await getMigrationStatus(db);
    const status = statuses.find(({ id }) => id === migrations[0].id);

    expect(status?.checksumMatches).toBe(true);
  });
});
