import { EmbeddingsProvider } from ".";
import GoogleProvider from "./providers/google";

const { EMBEDDINGS_PROVIDER } = process.env;

const SupportedProviders = ["google"];
const isValidProvider = (provider: string) => SupportedProviders.includes(provider);

if (!EMBEDDINGS_PROVIDER) {
  throw new Error(`EMBEDDINGS_PROVIDER is not defined`);
}

if (!isValidProvider(EMBEDDINGS_PROVIDER)) {
  throw new Error(`EMBEDDINGS_PROVIDER ${EMBEDDINGS_PROVIDER} is not supported`);
}

type IProviderKey = (typeof SupportedProviders)[number];

const PROVIDER_INSTANCES: Partial<Record<IProviderKey, EmbeddingsProvider>> = {};

const PROVIDER_CREATORS: Record<IProviderKey, () => EmbeddingsProvider> = {
  google: () => new GoogleProvider(),
};

export const getEmbedder = (): EmbeddingsProvider => {
  if (!EMBEDDINGS_PROVIDER) {
    throw new Error(`EMBEDDINGS_PROVIDER is not defined`);
  }
  if (!isValidProvider(EMBEDDINGS_PROVIDER)) {
    throw new Error(`EMBEDDINGS_PROVIDER ${EMBEDDINGS_PROVIDER} is not supported`);
  }

  const providerKey = EMBEDDINGS_PROVIDER as IProviderKey;
  if (!PROVIDER_INSTANCES[providerKey]) {
    PROVIDER_INSTANCES[providerKey] = PROVIDER_CREATORS[providerKey]();
  }

  return PROVIDER_INSTANCES[providerKey]!;
};
