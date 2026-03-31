import type { LinguiConfig } from "@lingui/conf";

const config: LinguiConfig = {
  locales: ["en", "es", "fr"],
  sourceLocale: "en",
  catalogs: [
    {
      path: "src/locales/{locale}/messages",
      include: ["src"],
    },
  ],
  format: "po",
  compileNamespace: "es",
};

export default config;
