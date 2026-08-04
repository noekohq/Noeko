import { RecordId, StringRecordId } from "surrealdb";
import type { IEmbeddingMetadata } from "../../../shared/types/embeddings";
import type { EmbeddingVector, EmbeddingsProvider } from ".";
import { getDatabase } from "../../database/db";
import { Idea } from "../../database/models/ideas";
import { ITag } from "../../../shared/types/tags";
import { IIdea } from "../../../shared/types/idea";
import { ITask } from "../../../shared/types/task";
import { ISource } from "../../../shared/types/source";
import { IExcerpt } from "../../../shared/types/excerpt";
import { htmlToMarkdown } from "../../utils/formatting";
import { buildFailedEmbeddingUpdate, buildReadyEmbeddingUpdate } from "./lifecycle";

export type EmbeddableRecord = IEmbeddingMetadata & {
  id: string | RecordId;
  embeddings?: EmbeddingVector | null;
};

export type EmbeddableTable = "idea" | "tag" | "task" | "source" | "excerpt";

export type EmbeddableModelAdapter<T extends EmbeddableRecord = EmbeddableRecord> = {
  table: EmbeddableTable;
  getRecords(options?: { limit?: number; start?: number }): Promise<T[]>;
  getEmbeddableContent(record: T): string | null;
  updateEmbedding(record: T, embedder: EmbeddingsProvider, content: string, vector: EmbeddingVector): Promise<unknown>;
  updateEmbeddingFailure(record: T, embedder: EmbeddingsProvider, content: string, error: unknown): Promise<unknown>;
  markStale(reason?: string): Promise<void>;
};

const getTableRecords = async <T extends EmbeddableRecord>(
  table: EmbeddableTable,
  options: { limit?: number; start?: number } = {}
): Promise<T[]> => {
  const db = await getDatabase();
  if (!db) {
    throw new Error("Database not available while loading embeddable records.");
  }

  const limit = options.limit ?? 100;
  const start = options.start ?? 0;
  const [records = []] = await db.query<[T[]]>(`SELECT * FROM ${table} LIMIT $limit START $start;`, {
    limit,
    start,
  });
  return records;
};

const mergeEmbeddingUpdate = async <T extends EmbeddableRecord>(
  record: T,
  update: Record<string, unknown>
) => {
  const db = await getDatabase();
  if (!db) {
    throw new Error("Database not available while updating embedding metadata.");
  }
  return await db.merge(new StringRecordId(record.id), update);
};

const markTableStale = async (table: EmbeddableTable, reason?: string) => {
  const db = await getDatabase();
  if (!db) {
    throw new Error("Database not available while marking embeddings stale.");
  }

  await db.query(
    `
      UPDATE ${table}
      SET
        embeddingsStatus = "stale",
        embeddingsError = $reason;
    `,
    { reason: reason ?? null }
  );
};

const makeAdapter = <T extends EmbeddableRecord>(
  table: EmbeddableTable,
  getEmbeddableContent: (record: T) => string | null
): EmbeddableModelAdapter<T> => {
  return {
    table,
    getRecords: (options) => getTableRecords<T>(table, options),
    getEmbeddableContent,
    updateEmbedding: (record, embedder, content, vector) =>
      mergeEmbeddingUpdate(record, buildReadyEmbeddingUpdate(embedder, content, vector)),
    updateEmbeddingFailure: (record, embedder, content, error) =>
      mergeEmbeddingUpdate(record, buildFailedEmbeddingUpdate(embedder, content, error)),
    markStale: (reason) => markTableStale(table, reason),
  };
};

export const embeddableModels = [
  makeAdapter<IIdea>("idea", (idea) => Idea.getEmbeddableContent(idea)),
  makeAdapter<ITag>("tag", (tag) => `${tag.name}:${tag.description}`),
  makeAdapter<ITask>("task", (task) => {
    return `${task.description}\n---\n${htmlToMarkdown(task.scratchpad ?? "")}`;
  }),
  makeAdapter<ISource>("source", (source) => {
    if (!source.analysis) {
      return null;
    }
    return `${source.analysis.headline}\n---\n${source.analysis.abstract}`;
  }),
  makeAdapter<IExcerpt>("excerpt", (excerpt) => {
    return `${excerpt.sourceText}\n---\n${excerpt.note}`;
  }),
] satisfies EmbeddableModelAdapter[];

export const getEmbeddableModel = (table: string) => {
  return embeddableModels.find((model) => model.table === table);
};
