import type { Migration } from "./types";

const embeddableTables = ["idea", "tag", "task", "source", "excerpt"];

const defineEmbeddingMetadataFields = (table: string) => `
  DEFINE FIELD IF NOT EXISTS embeddingsProvider ON TABLE ${table} TYPE option<string>;
  DEFINE FIELD IF NOT EXISTS embeddingsModel ON TABLE ${table} TYPE option<string>;
  DEFINE FIELD IF NOT EXISTS embeddingsDimension ON TABLE ${table} TYPE option<number>;
  DEFINE FIELD IF NOT EXISTS embeddingsContentHash ON TABLE ${table} TYPE option<string>;
  DEFINE FIELD IF NOT EXISTS embeddingsStatus ON TABLE ${table} TYPE option<string>;
  DEFINE FIELD IF NOT EXISTS embeddingsError ON TABLE ${table} TYPE option<string>;
`;

const removeEmbeddingMetadataFields = (table: string) => `
  REMOVE FIELD embeddingsProvider ON TABLE ${table};
  REMOVE FIELD embeddingsModel ON TABLE ${table};
  REMOVE FIELD embeddingsDimension ON TABLE ${table};
  REMOVE FIELD embeddingsContentHash ON TABLE ${table};
  REMOVE FIELD embeddingsStatus ON TABLE ${table};
  REMOVE FIELD embeddingsError ON TABLE ${table};
`;

export const migration: Migration = {
  id: "20260714120000_add_embedding_metadata_fields",
  description: "Add embedding lifecycle metadata fields to embeddable domain tables.",
  async up(db) {
    for (const table of embeddableTables) {
      await db.query(defineEmbeddingMetadataFields(table));
    }
  },
  async down(db) {
    for (const table of embeddableTables) {
      await db.query(removeEmbeddingMetadataFields(table));
    }
  },
};
