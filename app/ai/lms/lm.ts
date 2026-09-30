import GeminiProvider from "./providers/google";
import { LMProvider } from ".";
import { XAIProvider } from "./providers/grok";
import DeterministicProvider from "./providers/deterministic";
import OpenAIProvider from "./providers/openai";

const { LM_PROVIDER } = process.env;

const SupportedProviders = ["google", "xai", "openai", "deterministic"] as const;
type IProviderKey = (typeof SupportedProviders)[number];

const isValidProvider = (provider: string): provider is IProviderKey =>
  SupportedProviders.includes(provider as IProviderKey);

if (!LM_PROVIDER) {
  throw new Error(`LM_PROVIDER is not defined`);
}

if (!isValidProvider(LM_PROVIDER)) {
  throw new Error(`LM_PROVIDER ${LM_PROVIDER} is not supported`);
}

const PROVIDER_MAP: Record<IProviderKey, () => LMProvider> = {
  google: () => new GeminiProvider(),
  xai: () => new XAIProvider(),
  openai: () => new OpenAIProvider(),
  deterministic: () => new DeterministicProvider(),
};

export const getLM = (): LMProvider => {
  if (!LM_PROVIDER) {
    throw new Error(`LM_PROVIDER is not defined`);
  }
  if (!isValidProvider(LM_PROVIDER)) {
    throw new Error(`LM_PROVIDER is not supported`);
  }
  const LM = PROVIDER_MAP[LM_PROVIDER];
  return LM();
};
