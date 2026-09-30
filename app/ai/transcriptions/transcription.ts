import { TranscriptionProvider } from ".";
import OpenAITranscriptionProvider from "./providers/openai";

const SupportedProviders = ["openai"] as const;
type ProviderKey = (typeof SupportedProviders)[number];

const isProviderKey = (provider: string): provider is ProviderKey =>
  SupportedProviders.includes(provider as ProviderKey);

const PROVIDER_MAP: Record<ProviderKey, () => TranscriptionProvider> = {
  openai: () => new OpenAITranscriptionProvider(),
};

export const getTranscriptionProvider = (): TranscriptionProvider => {
  const provider = process.env.TRANSCRIPTION_PROVIDER || "openai";
  if (!isProviderKey(provider)) {
    throw new Error(`TRANSCRIPTION_PROVIDER ${provider} is not supported.`);
  }
  return PROVIDER_MAP[provider]();
};
