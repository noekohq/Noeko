# System Architecture Refactoring Plan: Monolithic Frontend to Domain-Driven Slices

**Objective:** Reorganize the horizontally sliced `src` directory into vertical, domain-driven bounded contexts. This prepares the application for an Elysia/Eden RPC backend migration, TanStack Query integration, and Web Worker offloading.

## Execution Constraints

- [ ] **Commit Frequently:** Make a commit after completing each Phase to ensure easy rollbacks if imports shatter.
- [ ] **Fix Imports Immediately:** Rely on the IDE/LSP to auto-update imports during file moves. If a move breaks imports, fix them using the new path aliases before moving to the next step.
- [ ] **Do Not Alter Logic:** Do not rewrite React component logic or hook internals unless absolutely necessary to fix a broken import. This is a structural migration.

## Phase 0: Setup Path Aliases

To ensure clean imports as files are moved into deep directory structures.

- [ ] Update `tsconfig.json` to include `@/*`, `@core/*`, `@infrastructure/*`, `@domains/*`, `@editor/*` in the `compilerOptions.paths` configuration.
- [ ] Update `vite.config.ts` to include corresponding aliases in the `resolve.alias` configuration.

## Phase 1: Establish `src/core/` (Design System & Framework Utilities)

This separates pure UI and pure functions from business logic.

- [ ] Create the directory structure for `src/core/design` (components, themes, styles, icons) and `src/core/utils`.
- [ ] Move Styles & Themes from `src/styles/*` and `src/themes/*` into `src/core/design/styles/` and `src/core/design/themes/`.
- [ ] Move Core UI (The Paper Library) components, generic layout components, and generic interactives (like `IconToggle.tsx`, `CollapseButton.tsx`, `CaptureButton.tsx`) to `src/core/design/components/`.
- [ ] Move Visuals & Icons (Icons, Animations, Loading components) to `src/core/design/`.
- [ ] Move Core Utils (pure functions only like `datetime.ts`, `math.ts`, `colors.ts`, `dom.ts`, `partialJsonParser.ts`, `scroll.ts`) to `src/core/utils/`.
- [ ] Verify and fix all imports referencing `@core/...`.

## Phase 2: Establish `src/infrastructure/` (API, Compute, DB)

Preparing for WebSockets, Web Workers, and OPFS.

- [ ] Create the directory structure for `src/infrastructure/` (api, compute, graph).
- [ ] Move API & Backend connections (`src/server/api.ts`, `src/utils/db.ts`) to `src/infrastructure/api/`.
- [ ] Move Compute (Workers) files to `src/infrastructure/compute/`.
- [ ] Abstract Graph Data Layer by moving `src/utils/graph.ts` and `src/vars/graph.ts` to `src/infrastructure/graph/`.
- [ ] Verify and fix all imports.

## Phase 3: Isolate `src/editor/` (DreamWriter Subsystem)

Treat the editor as a completely decoupled third-party package.

- [ ] Create the directory structure for `src/editor/`.
- [ ] Move the `DreamWriter` subsystem components into `src/editor/`.
- [ ] Create a public API by adding `src/editor/index.ts`.
- [ ] Inside `index.ts`, export only the `<DreamWriter />` component and any necessary external types. Do not export internal nodes or marks.
- [ ] Update any file importing `DreamWriter` to use the new `import { DreamWriter } from '@editor';` syntax.

## Phase 4: Distribute `src/domains/` (Business Logic Slices)

Collapse horizontal layers (hooks, pages, components, utils) into vertical business domains.

- [ ] **Domain 1: Identity** (Auth, Users, Settings)
  - Create directory structure.
  - Move related pages (`Auth`, `Users`, `Settings`), components (`Display/Users`), contexts (`AuthContext.tsx`), and utils/vars (`user.ts`, `users.ts`).
- [ ] **Domain 2: Discovery** (Search & Spyglass)
  - Create directory structure.
  - Move related pages (`Spyglass`, `All`), components (`Search`, `UI/Spotlight`, `Utils/Spyglass`), hooks (`useSearchQuery.ts`, `useSpyglassService.ts`), utils (`search.ts`, `spyglass.ts`), and contexts (`SearchContext.tsx`).
- [ ] **Domain 3: Constellation** (Visual Graph Rendering)
  - Create directory structure.
  - Move related pages (`Constellation`), components (`Graph`), and contexts (`GraphContext.tsx`).
  - _(Note: This domain will import from `@infrastructure/graph` for data, but handles rendering locally)._
- [ ] **Domain 4: Knowledge** (Ideas, Tasks, Sources)
  - Create directory structure.
  - Move related pages (`Idea`, `Tasks`, `Sources`), components (`Display/Ideas`, `Display/Tasks`, `Display/Sources`, `Display/Excerpts`, `Forms/CreateTask.tsx`, `Forms/AddSource.tsx`), hooks (`useConnectable.ts`, `useConnection.ts`, `usePins.ts`), and utils/vars (`ideas.ts`, `tasks.ts`, `sources.ts`, `excerpts.ts`).
- [ ] **Domain 5: Rabbitholes** (Meta-organization)
  - Create directory structure.
  - Move related pages (`Rabbitholes`), components (`Display/Rabbitholes`, `Display/Interactions/Rabbitholes`), hooks (`useRabbithole.ts`), and utils (`rabbitholes.ts`).
- [ ] **Domain 6: Dashboard** (Composition Root)
  - Create directory structure.
  - Move related pages (`Dashboard`) and components (`Widgets`).
- [ ] Verify and fix all imports across the newly created domains.

## Phase 5: Enforce Public API Contracts

Ensure domains do not reach into the internal files of other domains.

- [ ] For every domain in `src/domains/`, create an `index.ts` file at its root.
- [ ] Export only the components, hooks, or types that other domains are allowed to use from these index files.
- [ ] Ensure no domain imports internal files directly from another domain (e.g., `src/domains/discovery/index.ts` exports `SearchBar`, not internal pages).
- [ ] Run the application type checker to verify the application compiles without path errors.

## Phase 6: Cleanup

- [ ] Remove `REFACTORING_PLAN.md`
