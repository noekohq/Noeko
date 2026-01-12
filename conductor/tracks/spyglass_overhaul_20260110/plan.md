# Implementation Plan: Spyglass 2.0 Overhaul

This plan breaks down the Spyglass 2.0 Overhaul into manageable phases. Each task should be completed following the project's defined workflow.

---

## Phase 1: Foundational Backend & UI Scaffolding [checkpoint: 90dfed6]

*Objective: Modify backend services to support the new search modes and create the initial UI shells for the main components.*

-   [x] **Task: Update Spyglass Service** `ef9f6a6`
    -   [ ] Sub-task: In `app/services/Spyglass.ts`, refactor the main service to differentiate between "Glimpse Mode" and "Deep Focus" logic.
    -   [ ] Sub-task: Modify LLM response structures to provide data for the new UI (e.g., raw excerpts for Deep Focus, summaries for Glimpse).
    -   [ ] Sub-task: Manually test the service endpoints to ensure they behave as expected for each mode.
-   [x] **Task: Design Abstract Scope Builder Component** `d8863ce`
    -   [x] Sub-task: Create the initial file structure and scaffolding for the new reusable Scope Builder UI component.
    -   [x] Sub-task: Design the component's props and state management to handle tags, rabbitholes, and dates.
    -   [x] Sub-task: Implement a basic, non-functional version of the component to be integrated in the sidebar and main Spyglass page.
-   [x] **Task: Scaffold New Spyglass Page UI** `3584086`
    -   [x] Sub-task: In `@src/pages/Spyglass/Spyglass.tsx`, restructure the page to support toggling between "Glimpse" and "Deep Focus" modes.
    -   [x] Sub-task: Create placeholder components for the new "Guided Survey" layout and the full-width block display.
-   [x] **Task: Conductor - User Manual Verification 'Phase 1: Foundational Backend & UI Scaffolding' (Protocol in workflow.md)** `90dfed6`

---

## Phase 2: Simple Search & Sidebar Integration

*Objective: Implement the first tier of search and integrate the new scope and Glimpse functionalities into the sidebar.*

-   [ ] **Task: Implement Scope Builder in Sidebar**
    -   [ ] Sub-task: Integrate the abstract Scope Builder component into the sidebar UI.
    -   [ ] Sub-task: Wire up the component to filter the "Simple Search" results based on user selections (tags, dates, etc.).
    -   [ ] Sub-task: Manually test the filter functionality in the sidebar.
-   [ ] **Task: Implement Sidebar Glimpse Mode**
    -   [ ] Sub-task: Integrate a slimmed-down "Glimpse Mode" into the sidebar that allows for quick, summarized searches.
    -   [ ] Sub-task: Implement the "Export to Spyglass" feature, allowing a user to send the current sidebar search and scope to the main Spyglass page for a "Deep Focus" query.
    -   [ ] Sub-task: Manually test the Glimpse Mode and Export functionality.
-   [ ] **Task: Conductor - User Manual Verification 'Phase 2: Simple Search & Sidebar Integration' (Protocol in workflow.md)**

---

## Phase 3: Deep Focus Spyglass Implementation

*Objective: Fully implement the "Deep Focus" experience on the main Spyglass page.*

-   [ ] **Task: Implement "Deep Focus" Mode UI**
    -   [ ] Sub-task: Build the "Guided Survey" UI, displaying raw excerpts from search results directly intertwined with the LLM's output.
    -   [ ] Sub-task: Ensure the UI correctly reflects the granularity of the "Deep Focus" response data from the backend.
    -   [ ] Sub-task: Manually test the rendering and interactivity of the Deep Focus results.
-   [ ] **Task: Integrate Full Scope Builder**
    -   [ ] Sub-task: Integrate the expanded version of the abstract Scope Builder component onto the main Spyglass page.
    -   [ ] Sub-task: Ensure the component correctly passes the selected scope to the "Deep Focus" backend query.
-   [ ] **Task: Conductor - User Manual Verification 'Phase 3: Deep Focus Spyglass Implementation' (Protocol in workflow.md)**

---

## Phase 4: Glimpse Mode & History

*Objective: Complete the "Glimpse Mode" on the main page and fix the query history functionality.*

-   [ ] **Task: Implement Main "Glimpse Mode" UI**
    -   [ ] Sub-task: Build the Glimpse Mode UI on the main Spyglass page, which includes a summary followed by a list of results with individual explanations.
    -   [ ] Sub-task: Manually test the Glimpse Mode on the main page.
-   [ ] **Task: Fix and Polish Spyglass History**
    -   [ ] Sub-task: Investigate and fix the automatic saving of Spyglass queries in `@src/hooks/useSpyglassService.ts`.
    -   [ ] Sub-task: Polish the UI of the history list page (`@src/pages/Spyglass/Spyglass/Records.tsx`).
    -   [ ] Sub-task: Ensure the historical record view page (`@src/pages/Spyglass/Spyglass/Record.tsx`) functions correctly and uses the new UI components.
    -   [ ] Sub-task: Manually test the entire history feature (saving, listing, and viewing).
-   [ ] **Task: Conductor - User Manual Verification 'Phase 4: Glimpse Mode & History' (Protocol in workflow.md)**

---

## Phase 5: Conversational Context & Final Polish

*Objective: Enhance the conversational abilities of Spyglass and perform a final round of polishing.*

-   [ ] **Task: Improve Multi-Turn Conversational Context**
    -   [ ] Sub-task: Update the backend logic to allow Spyglass to maintain context over multiple follow-up questions.
    -   [ ] Sub-task: Manually test a multi-step conversation with Spyglass to ensure context is not lost.
-   [ ] **Task: Final UI/UX Polish**
    -   [ ] Sub-task: Perform a final review of all new UI components and layouts on both desktop and mobile.
    -   [ ] Sub-task: Address any remaining visual inconsistencies or bugs.
-   [ ] **Task: Conductor - User Manual Verification 'Phase 5: Conversational Context & Final Polish' (Protocol in workflow.md)**