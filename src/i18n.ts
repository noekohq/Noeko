import { i18n } from "@lingui/core";
import { t } from "@lingui/core/macro";
import { messages as enMessages } from "./locales/en/messages.ts";

export const locales = {
  en: "English",
  es: "Español",
  fr: "Français",
};

export const localeMap = () =>
  Object.entries(locales).map(([key, value]) => {
    return {
      label: value,
      value: key,
    };
  });

export async function dynamicActivate(locale: string) {
  const { messages } = await import(`./locales/${locale}/messages.ts`);
  i18n.load(locale, messages);
  i18n.activate(locale);
}

export const getI18NInstance = () => {
  return i18n;
};

i18n.load("en", enMessages);
i18n.activate("en");
