# System Architecture Refactoring Plan: Monolithic Frontend to Domain-Driven Slices

**Objective:** Reorganize the horizontally sliced `src` directory into vertical, domain-driven bounded contexts. This prepares the application for an Elysia/Eden RPC backend migration, TanStack Query integration, and Web Worker offloading.

## Execution Constraints

- [x] **Commit Frequently:** Make a commit after completing each Phase to ensure easy rollbacks if imports shatter.
- [x] **Fix Imports Immediately:** Rely on the IDE/LSP to auto-update imports during file moves. If a move breaks imports, fix them using the new path aliases before moving to the next step.
- [x] **Do Not Alter Logic:** Do not rewrite React component logic or hook internals unless absolutely necessary to fix a broken import. This is a structural migration.

## Phase 0: Setup Path Aliases

To ensure clean imports as files are moved into deep directory structures.

- [x] Update `tsconfig.json` to include `@/*`, `@core/*`, `@infrastructure/*`, `@domains/*`, `@editor/*` in the `compilerOptions.paths` configuration.
- [x] Update `vite.config.ts` to include corresponding aliases in the `resolve.alias` configuration.

## Phase 1: Establish `src/core/` (Design System & Framework Utilities)

This separates pure UI and pure functions from business logic.

- [x] Create the directory structure for `src/core/design` (components, themes, styles, icons) and `src/core/utils`.
- [x] Move Styles & Themes from `src/styles/*` and `src/themes/*` into `src/core/design/styles/` and `src/core/design/themes/`.
- [x] Move Core UI (The Paper Library) components, generic layout components, and generic interactives (like `IconToggle.tsx`, `CollapseButton.tsx`, `CaptureButton.tsx`) to `src/core/design/components/`.
- [x] Move Visuals & Icons (Icons, Animations, Loading components) to `src/core/design/`. *(Note: Found lingering generic UI pieces in `Utils/Info` and `Utils/Loading` like `Match.tsx` and `StageIndicator` that were moved over as well).*
- [x] Move Core Utils (pure functions only like `datetime.ts`, `math.ts`, `colors.ts`, `dom.ts`, `partialJsonParser.ts`, `scroll.ts`) to `src/core/utils/`.
- [x] Verify and fix all imports referencing `@core/...`. *(Note: Leveraged node scripts to do regex find-and-replaces across the codebase. Kept feature-level interaction components like `StatusButton` where they were until Phase 4, but aliased their imports to not break `Core`)*.

## Phase 2: Establish `src/infrastructure/` (API, Compute, DB)

Preparing for WebSockets, Web Workers, and OPFS.

- [x] Create the directory structure for `src/infrastructure/` (api, compute, graph).
- [x] Move API & Backend connections (`src/server/api.ts`, `src/utils/db.ts`) to `src/infrastructure/api/`.
- [x] Move Compute (Workers) files to `src/infrastructure/compute/`.
- [x] Abstract Graph Data Layer by moving `src/utils/graph.ts` and `src/vars/graph.ts` to `src/infrastructure/graph/`.
- [x] Verify and fix all imports. *(Note: Ran into an issue where a global regex replace mangled `../../shared` and `../../app` relative paths. Wrote a script to accurately calculate absolute depths to the project root and restored the proper relative path layers).*

## Phase 3: Isolate `src/editor/` (DreamWriter Subsystem)

Treat the editor as a completely decoupled third-party package.

- [x] Create the directory structure for `src/editor/`.
- [x] Move the `DreamWriter` subsystem components into `src/editor/`.
- [x] Create a public API by adding `src/editor/index.ts`.
- [x] Inside `index.ts`, export only the `<DreamWriter />` component and any necessary external types. Do not export internal nodes or marks.
- [x] Update any file importing `DreamWriter` to use the new `import { DreamWriter } from '@editor';` syntax. *(Note: Added a bare alias `"@editor": ["./src/editor"]` to `tsconfig.json` and `vite.config.ts` to allow importing directly from the package root. Also repaired backward-pointing relative imports inside the editor to use the generic `@/components/...` aliases rather than fragile `../../` paths).*

## Phase 4: Distribute `src/domains/` (Business Logic Slices)

Collapse horizontal layers (hooks, pages, components, utils) into vertical business domains.

- [x] **Domain 1: Identity** (Auth, Users, Settings)
  - Create directory structure.
  - Move related pages (`Auth`, `Users`, `Settings`), components (`Display/Users`), contexts (`AuthContext.tsx`), and utils/vars (`user.ts`, `users.ts`).
- [x] **Domain 2: Discovery** (Search & Spyglass)
  - Create directory structure.
  - Move related pages (`Spyglass`, `All`), components (`Search`, `UI/Spotlight`, `Utils/Spyglass`), hooks (`useSearchQuery.ts`, `useSpyglassService.ts`), utils (`search.ts`, `spyglass.ts`), and contexts (`SearchContext.tsx`).
- [x] **Domain 3: Constellation** (Visual Graph Rendering)
  - Create directory structure.
  - Move related pages (`Constellation`), components (`Graph`), and contexts (`GraphContext.tsx`).
  - _(Note: This domain will import from `@infrastructure/graph` for data, but handles rendering locally)._
- [x] **Domain 4: Knowledge** (Ideas, Tasks, Sources)
  - Create directory structure.
  - Move related pages (`Idea`, `Tasks`, `Sources`), components (`Display/Ideas`, `Display/Tasks`, `Display/Sources`, `Display/Excerpts`, `Forms/CreateTask.tsx`, `Forms/AddSource.tsx`), hooks (`useConnectable.ts`, `useConnection.ts`, `usePins.ts`), and utils/vars (`ideas.ts`, `tasks.ts`, `sources.ts`, `excerpts.ts`).
- [x] **Domain 5: Rabbitholes** (Meta-organization)
  - Create directory structure.
  - Move related pages (`Rabbitholes`), components (`Display/Rabbitholes`, `Display/Interactions/Rabbitholes`), hooks (`useRabbithole.ts`), and utils (`rabbitholes.ts`).
- [x] **Domain 6: Dashboard** (Composition Root)
  - Create directory structure.
  - Move related pages (`Dashboard`) and components (`Widgets`).
- [x] Verify and fix all imports across the newly created domains. *(Note: Successfully distributed all horizontal layers into their respective domain vertical slices. Repaired all cross-domain and infrastructure imports using automated scripts to fix path depths).*

## Phase 5: Enforce Public API Contracts

Ensure domains do not reach into the internal files of other domains.

- [ ] For every domain in `src/domains/`, create an `index.ts` file at its root.
- [ ] Export only the components, hooks, or types that other domains are allowed to use from these index files.
- [ ] Ensure no domain imports internal files directly from another domain (e.g., `src/domains/discovery/index.ts` exports `SearchBar`, not internal pages).
- [ ] Run the application type checker to verify the application compiles without path errors.

## Phase 6: Cleanup

- [ ] Remove `REFACTORING_PLAN.md`
