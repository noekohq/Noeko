import { EmbeddingsProvider } from ".";
import GoogleProvider from "./providers/google";

const { EMBEDDINGS_PROVIDER } = process.env;

const SupportedProviders = ["google"];
const isValidProvider = (provider: string) =>
  SupportedProviders.includes(provider);

if (!EMBEDDINGS_PROVIDER) {
  throw new Error(`EMBEDDINGS_PROVIDER is not defined`);
}

if (!isValidProvider(EMBEDDINGS_PROVIDER)) {
  throw new Error(
    `EMBEDDINGS_PROVIDER ${EMBEDDINGS_PROVIDER} is not supported`,
  );
}

type IProviderKey = (typeof SupportedProviders)[number];

const PROVIDER_MAP: Record<IProviderKey, EmbeddingsProvider> = {
  google: new GoogleProvider(),
};

export const getEmbedder = (): EmbeddingsProvider => {
  if (!EMBEDDINGS_PROVIDER) {
    throw new Error(`EMBEDDINGS_PROVIDER is not defined`);
  }
  if (!isValidProvider(EMBEDDINGS_PROVIDER)) {
    throw new Error(
      `EMBEDDINGS_PROVIDER ${EMBEDDINGS_PROVIDER} is not supported`,
    );
  }
  const LM = PROVIDER_MAP[EMBEDDINGS_PROVIDER];
  return LM;
};
