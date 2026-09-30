import type { EmbeddingsProvider } from ".";
import { getEmbeddingsConfig, type EmbeddingsConfig } from "./config";
import DeterministicProvider from "./providers/deterministic";
import GoogleProvider from "./providers/google";
import OpenAIProvider from "./providers/openai";

const PROVIDER_INSTANCES: Partial<Record<string, EmbeddingsProvider>> = {};

const getProviderCacheKey = (config: EmbeddingsConfig) => {
  return [config.provider, config.model ?? "", config.dimension].join(":");
};

const createProvider = (config: EmbeddingsConfig): EmbeddingsProvider => {
  if (config.provider === "google") {
    return new GoogleProvider(config);
  }

  if (config.provider === "openai") {
    return new OpenAIProvider(config);
  }

  if (config.provider === "deterministic") {
    return new DeterministicProvider(config);
  }

  throw new Error(`Unsupported embeddings provider: ${config.provider}`);
};

export const getEmbedder = (): EmbeddingsProvider => {
  const config = getEmbeddingsConfig();
  const cacheKey = getProviderCacheKey(config);

  if (!PROVIDER_INSTANCES[cacheKey]) {
    PROVIDER_INSTANCES[cacheKey] = createProvider(config);
  }

  return PROVIDER_INSTANCES[cacheKey]!;
};
