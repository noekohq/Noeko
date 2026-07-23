import { createHash } from "node:crypto";
import type { EmbeddingsProvider, EmbeddingVector } from ".";
import { toPersistedVector } from "./vectors";
import type { IEmbeddingMetadata } from "../../../shared/types/embeddings";

export type EmbeddingUpdate = IEmbeddingMetadata & {
  embeddings: EmbeddingVector | null;
  embeddingsUpdatedAt: Date;
};

export type ReadyEmbeddingUpdate = IEmbeddingMetadata & {
  embeddings: EmbeddingVector;
  embeddingsUpdatedAt: Date;
};

export const getEmbeddingContentHash = (content: string) => {
  return createHash("sha256").update(content).digest("hex");
};

export const getEmbeddingProfile = (embedder: EmbeddingsProvider) => {
  return {
    embeddingsProvider: embedder.provider,
    embeddingsModel: embedder.model,
    embeddingsDimension: embedder.dimension,
  };
};

export const buildReadyEmbeddingUpdate = (
  embedder: EmbeddingsProvider,
  content: string,
  vector: EmbeddingVector
): ReadyEmbeddingUpdate => {
  return {
    embeddings: toPersistedVector(vector, embedder.dimension, `${embedder.provider}:${embedder.model}`),
    embeddingsUpdatedAt: new Date(),
    embeddingsContentHash: getEmbeddingContentHash(content),
    embeddingsStatus: "ready",
    ...getEmbeddingProfile(embedder),
  };
};

export const buildFailedEmbeddingUpdate = (
  embedder: EmbeddingsProvider,
  content: string,
  error: unknown
): EmbeddingUpdate => {
  const message = error instanceof Error ? error.message : String(error);
  return {
    embeddings: null,
    embeddingsUpdatedAt: new Date(),
    embeddingsContentHash: getEmbeddingContentHash(content),
    embeddingsStatus: "failed",
    embeddingsError: message,
    ...getEmbeddingProfile(embedder),
  };
};

export const isEmbeddingCurrent = (
  record: IEmbeddingMetadata & { embeddings?: EmbeddingVector | null },
  embedder: EmbeddingsProvider,
  content: string
) => {
  return (
    !!record.embeddings?.length &&
    record.embeddingsProvider === embedder.provider &&
    record.embeddingsModel === embedder.model &&
    record.embeddingsDimension === embedder.dimension &&
    record.embeddingsContentHash === getEmbeddingContentHash(content) &&
    record.embeddingsStatus === "ready"
  );
};
