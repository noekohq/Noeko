import { describe, expect, it } from "vitest";
import type { EmbeddingsProvider } from "../../../app/ai/embeddings";
import {
  buildReadyEmbeddingUpdate,
  isEmbeddingCurrent,
} from "../../../app/ai/embeddings/lifecycle";
import { getEmbeddingProfileFilter } from "../../../app/ai/embeddings/query";

const embedder: EmbeddingsProvider = {
  provider: "test",
  model: "test-model",
  dimension: 3,
  supportsBatch: true,
  embedContent: async () => [1, 0, 0],
  embedContents: async () => [[1, 0, 0]],
  getEmptyEmbeddings: async () => [0, 0, 0],
  listAvailableModels: async () => ["test-model"],
};

describe("embedding lifecycle", () => {
  it("clears an earlier lifecycle error when an embedding becomes ready", () => {
    const update = buildReadyEmbeddingUpdate(embedder, "canonical content", [1, 0, 0]);

    expect(update.embeddingsStatus).toBe("ready");
    expect(update.embeddingsError).toBeUndefined();
    expect(isEmbeddingCurrent(update, embedder, "canonical content")).toBe(true);
  });

  it("builds a search filter for the complete active embedding profile", () => {
    const filter = getEmbeddingProfileFilter(embedder);

    expect(filter.clauses).toEqual([
      `embeddingsStatus = "ready"`,
      "embeddingsProvider = $embeddingProfileProvider",
      "embeddingsModel = $embeddingProfileModel",
      "embeddingsDimension = $embeddingProfileDimension",
    ]);
    expect(filter.params).toEqual({
      embeddingProfileProvider: "test",
      embeddingProfileModel: "test-model",
      embeddingProfileDimension: 3,
    });
  });
});
