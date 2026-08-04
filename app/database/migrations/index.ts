import { migration as createSchemaMigration } from "./20260629233000_create_schema_migration";
import { migration as addSchemaMigrationMetadata } from "./20260629233100_add_schema_migration_metadata";
import { migration as addEmbeddingMetadataFields } from "./20260714120000_add_embedding_metadata_fields";
import { migration as addSpyglassRuns } from "./20260728120000_add_spyglass_runs";
import { migration as addAutomation } from "./20260803200000_add_automation";
import type { Migration } from "./types";

export const migrations: Migration[] = [
  createSchemaMigration,
  addSchemaMigrationMetadata,
  addEmbeddingMetadataFields,
  addSpyglassRuns,
  addAutomation,
].sort((a, b) => a.id.localeCompare(b.id));
