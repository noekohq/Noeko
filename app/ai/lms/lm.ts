import GeminiProvider from "./providers/google";
import { LMProvider } from ".";

const { LM_PROVIDER } = process.env;

const SupportedProviders = ["google"];

const isValidProvider = (provider: string) =>
  SupportedProviders.includes(provider);

if (!LM_PROVIDER) {
  throw new Error(`LM_PROVIDER is not defined`);
}

if (!isValidProvider(LM_PROVIDER)) {
  throw new Error(`LM_PROVIDER ${LM_PROVIDER} is not supported`);
}

type IProviderKey = (typeof SupportedProviders)[number];

const PROVIDER_MAP: Record<IProviderKey, () => LMProvider> = {
  google: () => new GeminiProvider(),
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
