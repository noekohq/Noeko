# Specification: Lingui Integration and Settings Page UI Update

## Objective

This document outlines the plan to integrate the Lingui internationalization (i18n) library into the Noeko application. The goal is to enable multi-language support, allowing users to select their preferred language. As part of this effort, the settings page will be updated to include a language selection UI.

## Tech Stack

- **i18n Framework:** [Lingui](https://lingui.js.org/)
- **Frontend Framework:** React
- **Build Tool:** Vite
- **Package Manager:** bun

## Plan

### 1. Dependency Installation

The following dependencies will be added to the project:

```bash
# For Lingui core and React integration
bun add @lingui/react @lingui/core

# For development and build process
bun add --dev @lingui/cli @lingui/vite-plugin @lingui/macro
```

### 2. Lingui Configuration

A `lingui.config.ts` file will be created in the project root to configure locales and message catalogs:

```typescript
// lingui.config.ts
import type { LinguiConfig } from "@lingui/conf";

const config: LinguiConfig = {
  locales: ["en", "es", "fr"], // Supported locales
  sourceLocale: "en", // Default language
  catalogs: [
    {
      path: "src/locales/{locale}/messages",
      include: ["src"],
    },
  ],
  format: "po",
};

export default config;
```

### 3. Vite Configuration

The `vite.config.ts` file will be updated to include the Lingui Vite plugin.

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { lingui } from "@lingui/vite-plugin";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ["macros"],
      },
    }),
    lingui(),
  ],
});
```

### 4. i18n Provider Setup

A new file, `src/i18n.ts`, will be created to manage the i18n instance and dynamically load locales.

```typescript
// src/i18n.ts
import { i18n } from "@lingui/core";
import { messages as enMessages } from "./locales/en/messages";

export const locales = {
  en: "English",
  es: "Español",
  fr: "Français",
};

export async function dynamicActivate(locale: string) {
  const { messages } = await import(`./locales/${locale}/messages.po`);
  i18n.load(locale, messages);
  i18n.activate(locale);
}

i18n.load("en", enMessages);
i18n.activate("en");
```

The main application entry point, `src/main.tsx`, will be wrapped with the `I18nProvider`.

```tsx
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { I18nProvider } from "@lingui/react";
import { i18n } from "@lingui/core";
import { dynamicActivate } from "./i18n";

dynamicActivate("en");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider i18n={i18n}>
      <App />
    </I18nProvider>
  </React.StrictMode>
);
```

### 5. Update `package.json`

The following scripts will be added to `package.json` to manage the i18n workflow:

```json
"scripts": {
  "extract": "lingui extract",
  "compile": "lingui compile",
}
```

### 6. Update Settings Page UI

A new `LanguageSettings` component will be created and added to `src/pages/Settings/Settings.tsx`. This component will allow users to select their preferred language.

The `AppearanceSettings` component in `src/pages/Settings/Settings.tsx` will be modified to include the new `LanguageSettings` component. A new `Select` component will be added to the `AppearanceSettings` for language selection.

### 7. String Extraction and Translation

After the integration is complete, all user-facing strings in the application will be wrapped with the `Trans` macro from `@lingui/macro`. The `bun run extract` command will be used to generate `.po` files for each locale. These files will then be translated.

## File Manifest

### New Files

- `lingui.config.ts`
- `src/i18n.ts`
- `src/locales/en/messages.po`
- `src/locales/es/messages.po`
- `src/locales/fr/messages.po`
- `conductor/tracks/lingui_integration/spec.md`

### Modified Files

- `package.json`
- `vite.config.ts`
- `src/main.tsx`
- `src/pages/Settings/Settings.tsx`
- `src/contexts/SettingsContext.tsx`
- All files containing user-facing strings.

This specification provides a comprehensive overview of the planned Lingui integration.
Once this plan is approved, I will proceed with the implementation.
