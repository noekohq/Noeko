import type { EmbeddingsProvider } from ".";

export const getEmbeddingProfileFilter = (
  embedder: EmbeddingsProvider,
  parameterPrefix = "embeddingProfile"
) => {
  const providerParameter = `${parameterPrefix}Provider`;
  const modelParameter = `${parameterPrefix}Model`;
  const dimensionParameter = `${parameterPrefix}Dimension`;

  return {
    clauses: [
      `embeddingsStatus = "ready"`,
      `embeddingsProvider = $${providerParameter}`,
      `embeddingsModel = $${modelParameter}`,
      `embeddingsDimension = $${dimensionParameter}`,
    ],
    params: {
      [providerParameter]: embedder.provider,
      [modelParameter]: embedder.model,
      [dimensionParameter]: embedder.dimension,
    },
  };
};
