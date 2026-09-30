import type { Migration } from "./types";

type VectorIndex = {
  name: string;
  table: string;
  options?: string;
};

const vectorIndexes: readonly VectorIndex[] = [
  {
    name: "idx_idea_embeddings",
    table: "idea",
    options: "M 32 EFC 400",
  },
  {
    name: "idx_tag_embeddings",
    table: "tag",
  },
  {
    name: "idx_task_embeddings",
    table: "task",
  },
  {
    name: "idx_source_embeddings",
    table: "source",
  },
  {
    name: "idx_excerpt_embeddings",
    table: "excerpt",
  },
] as const;

const defineVectorIndex = (index: VectorIndex, dimension: number) => `
  DEFINE INDEX IF NOT EXISTS ${index.name}
    ON TABLE ${index.table}
    FIELDS embeddings
    HNSW DIMENSION ${dimension}
    DIST COSINE
    TYPE F32
    ${index.options ?? ""};
`;

export const migration: Migration = {
  id: "20260730192000_move_embedding_indexes_to_migrations",
  description:
    "Move 768-dimensional embedding index ownership to migrations and remove the duplicate rabbithole tag index.",
  async up(db) {
    for (const index of vectorIndexes) {
      await db.query(defineVectorIndex(index, 768));
    }
    await db.query("REMOVE INDEX IF EXISTS idx_rabbithole_embeddings ON TABLE tag;");
  },
  async down(db) {
    for (const index of [...vectorIndexes].reverse()) {
      await db.query(`REMOVE INDEX IF EXISTS ${index.name} ON TABLE ${index.table};`);
    }
    await db.query(`
      DEFINE INDEX IF NOT EXISTS idx_rabbithole_embeddings
        ON TABLE tag
        FIELDS embeddings
        HNSW DIMENSION 768
        DIST COSINE
        TYPE F32;
    `);
  },
};
