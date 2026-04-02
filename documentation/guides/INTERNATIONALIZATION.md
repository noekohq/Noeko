# Internationalization
This guide explains how to implement internationalization standards for features and codebase updates. The codebase uses `lingui` which is a macro-based internationalization library. Let's break it down subsequently. 

## Supported Locales
We try to support a broad set of locales to ensure that users from across the globe can use Noeko accessibly. This isn't the source of truth per-se (see supported locales in `src/i18n.ts`), but as a general rule we support:

- English (default)
- Spanish
- French
- German
- Japanese
- Mandarin
- Korean

### Adding a new Locale
To add a new locale requires a few distinct steps.
1. Add the new locale in `src/i18n.ts` (settings will automatically update)
2. Run `i18n:extract` script 
  2a. a new locale `src/locales/<locale>/messages.po` file will appear
3. Update the new `messages.po` file with translations for new locale
4. Run `i18n:compile` for changes to apply

## Using Translation Macros
To actually use the translations in the UI, strings have to be wrapped in `i18n` macros so that the `i18n:extract` and `i18n:compile` scripts know what to translate. Lingui exposes the `Trans` and `t` macros, which wrap individual strings. `Trans` is for JSX, and `t` is for imperative situations. The `useLingui` hook exposes access to the `i18n` instance currently activated, which is reactive to changes to the current locale.

**Example Usage**
For usage directly in React components' rendered JSX, import the `Trans` component from `@lingui/react/macro` and use it in the component.

```tsx
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/core/macro";

export default function Example() {
  const { i18n } = useLingui();
  
  const thing = i18n._(t`This is another string`)
  
  return <div>
    <Trans>This is a string</Trans>
    <div>{thing}</div>
  </div>
}
```

## Adding to new features
With the context in mind, all that's important to remember is to ensure that new components and frontend updates _do_ include this translation functionality. For our various locales. So as a new update is made, each individual locale's `messages.po` file in `src/locales/**` needs to be updated with the translations.

To ensure localization works for updates, this is the general process:
1. Make changes, updates, etc.
2. Use the `t` and `Trans` macros for all visible strings
3. Run `bun run i18n:extract`
4. Ensure that all `messages.po` files have all translations defined
5. Run `bun run i18n:compile` to build the translations
6. Test that the translations reflect in the UI through manual testing

> [!note]
> We use a Husky pre-commit hook that automatically runs `i18n:extract` and `i18n:compile` on your staged files. This acts as a safety net to ensure our compiled catalogs and source code are always in sync before pushing.
