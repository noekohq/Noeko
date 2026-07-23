import { default_embeddings_dimension } from "../../settings";

export const SupportedEmbeddingProviders = ["google", "deterministic"] as const;

export type EmbeddingsProviderKey = (typeof SupportedEmbeddingProviders)[number];

export type EmbeddingsConfig = {
  provider: EmbeddingsProviderKey;
  model?: string;
  dimension: number;
};

export const isSupportedEmbeddingProvider = (
  provider: string
): provider is EmbeddingsProviderKey => {
  return SupportedEmbeddingProviders.includes(provider as EmbeddingsProviderKey);
};

const parseDimension = () => {
  const dimension = Number(process.env.EMBEDDINGS_DIMENSION) || default_embeddings_dimension;
  if (!Number.isInteger(dimension) || dimension <= 0) {
    throw new Error(`EMBEDDINGS_DIMENSION must be a positive integer. Received: ${dimension}`);
  }
  return dimension;
};

export const getEmbeddingsConfig = (): EmbeddingsConfig => {
  const provider = process.env.EMBEDDINGS_PROVIDER;
  if (!provider) {
    throw new Error("EMBEDDINGS_PROVIDER is not defined");
  }

  if (!isSupportedEmbeddingProvider(provider)) {
    throw new Error(
      `EMBEDDINGS_PROVIDER ${provider} is not supported. Supported providers: ${SupportedEmbeddingProviders.join(", ")}`
    );
  }

  return {
    provider,
    model: process.env.EMBEDDINGS_MODEL,
    dimension: parseDimension(),
  };
};
