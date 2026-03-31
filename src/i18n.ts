import { i18n } from "@lingui/core";
import { messages as enMessages } from "./locales/en/messages.ts";

export const locales = {
  en: "English",
  es: "Español",
  fr: "Français",
};

export async function dynamicActivate(locale: string) {
  const { messages } = await import(`./locales/${locale}/messages.ts`);
  i18n.load(locale, messages);
  i18n.activate(locale);
}

i18n.load("en", enMessages);
i18n.activate("en");
