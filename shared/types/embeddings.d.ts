export type IEmbeddingStatus = "ready" | "stale" | "failed";

export type IEmbeddingMetadata = {
  embeddingsProvider?: string | null;
  embeddingsModel?: string | null;
  embeddingsDimension?: number | null;
  embeddingsContentHash?: string | null;
  embeddingsStatus?: IEmbeddingStatus | null;
  embeddingsError?: string | null;
};
