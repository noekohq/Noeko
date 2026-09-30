# Localization Migration Guide

This document provides strict, repeatable instructions for migrating the Noeko codebase to support internationalization (i18n) using `lingui`. 

Your objective is to systematically traverse the checklist below, update hardcoded strings to use Lingui macros, and compile the translation catalogs.

## 🛠️ Instructions for Agents

For each file in the checklist, perform the following steps carefully:

### 1. Identify Target Strings
Locate all user-facing, hardcoded strings in the file. This includes:
- JSX text nodes (e.g., `<p>Hello World</p>`)
- String attributes (e.g., `placeholder="Search..."`, `title="Submit"`)
- Imperative strings in JS/TS logic (e.g., `toast.success("Saved!")`)

### 2. Apply Lingui Macros

**For JSX Elements:**
Wrap standard text in `<Trans>`.
```tsx
// IMPORT REQUIRED:
import { Trans } from "@lingui/react/macro";

// BEFORE:
<div>Hello World</div>

// AFTER:
<div><Trans>Hello World</Trans></div>
```

**For String Attributes & Imperative Logic:**
Wrap strings in the `t` macro. If the string is evaluated within JSX attributes, it can usually just be `t\`String\``. If it needs to be processed by the `i18n` instance directly in a hook/function, use `i18n._(t\`...\`)`.
```tsx
// IMPORTS REQUIRED:
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react"; // Only if you need the i18n instance

// BEFORE:
<input placeholder="Search files..." />
const msg = "Task completed";

// AFTER (Attribute):
<input placeholder={t`Search files...`} />

// AFTER (Imperative hook/function):
const { i18n } = useLingui();
const msg = i18n._(t`Task completed`);
```

### 3. Extract & Compile Translations
After modifying a batch of files (e.g., completing one domain/section):
1. Run `bun run i18n:extract`. This will populate `src/locales/<locale>/messages.po`.
2. Open the newly generated `.po` files and provide translations for the newly added msgids. *(If you do not have translation capabilities, leave them blank for the localization team, but ensure extraction succeeds).*
3. Run `bun run i18n:compile` to generate the compiled catalogs.
4. Run `bun run typecheck` and `bun test` to ensure you didn't break functionality.

---

## 📋 Migration Checklist

The following files require localization. They are grouped by domain. Mark them off `[x]` as you complete them.

*(Note: `src/domains/identity/pages/Settings` has already been localized and is omitted from this list.)*

### Core App
- [x] `src/App.tsx`
- [x] `src/Error.tsx`

### Domain: Identity (Auth & Users)
- [x] `src/domains/identity/pages/Auth/Login.tsx`
- [x] `src/domains/identity/pages/Auth/Register.tsx`
- [x] `src/domains/identity/pages/Auth/ForgotPassword.tsx`
- [x] `src/domains/identity/pages/Auth/ResetPassword.tsx`
- [x] `src/domains/identity/pages/Auth/Unauthorized.tsx`
- [x] `src/domains/identity/pages/Users/Users.tsx`
- [x] `src/domains/identity/pages/Users/UsersOld.tsx`

### Domain: Dashboard
- [x] `src/domains/dashboard/pages/Dashboard/Dashboard.tsx`
- [x] `src/domains/dashboard/pages/Dashboard/DashboardOld.tsx`
- [x] `src/domains/dashboard/pages/Dashboard/Experimental.tsx`
- [x] `src/domains/dashboard/pages/Dashboard/Mobile/Do.tsx`
- [x] `src/domains/dashboard/pages/Dashboard/Mobile/Think.tsx`
- [x] `src/domains/dashboard/pages/Dashboard/Mobile/Mobile.tsx`

### Domain: Discovery
- [x] `src/domains/discovery/pages/All/All.tsx`
- [x] `src/domains/discovery/pages/Spyglass/Spyglass.tsx`
- [x] `src/domains/discovery/pages/Spyglass/Textbox.tsx`
- [x] `src/domains/discovery/pages/Spyglass/Citation.tsx`
- [x] `src/domains/discovery/pages/Spyglass/Spyglass/Record.tsx`
- [x] `src/domains/discovery/pages/Spyglass/Spyglass/Records.tsx`
- [x] `src/domains/discovery/pages/Spyglass/Spyglass/SpyglassActions.tsx`
- [x] `src/domains/discovery/pages/Spyglass/Spyglass/SpyglassContext.tsx`

### Domain: Knowledge
- [x] `src/domains/knowledge/pages/Agenda/Agenda.tsx`
- [x] `src/domains/knowledge/pages/File/File.tsx`
- [x] `src/domains/knowledge/pages/File/FileList.tsx`
- [x] `src/domains/knowledge/pages/Idea/Idea.tsx`
- [x] `src/domains/knowledge/pages/Idea/Ideas.tsx`
- [x] `src/domains/knowledge/pages/Idea/Connections.tsx`
- [x] `src/domains/knowledge/pages/Idea/Filtered.tsx`
- [x] `src/domains/knowledge/pages/Idea/Insights.tsx`
- [x] `src/domains/knowledge/pages/Idea/PublicIdea.tsx`
- [x] `src/domains/knowledge/pages/Idea/ViewIdea.tsx`
- [x] `src/domains/knowledge/pages/Insights/Insights.tsx`
- [x] `src/domains/knowledge/pages/Pins/Pins.tsx`
- [x] `src/domains/knowledge/pages/Sharing/Sharing.tsx`
- [x] `src/domains/knowledge/pages/Sources/Source.tsx`
- [x] `src/domains/knowledge/pages/Sources/SourceContext.tsx`
- [x] `src/domains/knowledge/pages/Sources/SourceList.tsx`
- [x] `src/domains/knowledge/pages/Tags/Tags.tsx`
- [x] `src/domains/knowledge/pages/Tags/ViewTag.tsx`
- [x] `src/domains/knowledge/pages/Tasks/Task.tsx`
- [x] `src/domains/knowledge/pages/Tasks/Tasks.tsx`

### Domain: Rabbitholes
- [x] `src/domains/rabbitholes/pages/Rabbitholes/List.tsx`
- [x] `src/domains/rabbitholes/pages/Rabbitholes/Rabbithole.tsx`

### Domain: System
- [x] `src/domains/system/pages/Export/Export.tsx`
- [x] `src/domains/system/pages/Import/Import.tsx`
- [x] `src/domains/system/pages/Import/importers/Directory.tsx`
- [x] `src/domains/system/pages/Import/importers/MarkdownFile.tsx`
- [x] `src/domains/system/pages/Import/importers/TextFile.tsx`

### Domain: Admin
- [x] `src/domains/admin/pages/Admin.tsx`
- [x] `src/domains/admin/pages/Feedback/Feedback.tsx`
- [x] `src/domains/admin/pages/Feedback/FeedbackOld.tsx`
- [x] `src/domains/admin/pages/Feedback/Updates.tsx`

### Domain: Constellation
- [x] `src/domains/constellation/pages/Constellation/Constellation.tsx`
- [x] `src/domains/constellation/pages/Constellation/ConstellationActions.tsx`
- [x] `src/domains/constellation/pages/Constellation/ConstellationContext.tsx`

---

## ⚠️ Strict Agent Rules
1. **Never alter existing logic:** Do not refactor components, rename variables, or change state management. Your sole job is to wrap strings.
2. **Never change dependency versions:** Do not update `package.json`.
3. **Ignore test files:** Do NOT touch `.test.tsx` or `.spec.tsx` files.
4. **Always Typecheck:** After you finish a domain, run `bun run typecheck`. Lingui macros must be imported correctly, or TypeScript will fail. 
