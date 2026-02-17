# Track Specification: Spyglass 2.0 Overhaul

## 1. Overview

This track details a comprehensive overhaul of the Spyglass feature, aimed at elevating it from a beta feature to a core, polished part of the application. The project is centered around a new three-tiered search paradigm, a complete UI/UX revamp for search and filtering, robust history management, and improved conversational capabilities. This will require full-stack changes, from backend services to frontend components.

## 2. Core Functional Requirements

### 2.1. Three-Tiered Search Model

The search experience will be unified under three distinct modes:

1.  **Simple Search**: A fast, hybrid search combining Full-Text Search (FTS) and semantic capabilities. This will be the primary search method in the application's sidebar.
2.  **Glimpse Mode Spyglass**: A one-shot, LM-assisted search designed for speed. The model will receive search results, analyze them, and return a quick, summarized answer. This will be available in the main Spyglass page and as a slimmed-down integration in the sidebar. The UI will present a summary followed by a list of results, each with an explanation of why it's considered useful.
3.  **Deep Focus Spyglass**: A highly detailed and granular analysis mode. The model will meticulously review search results, extracting individual lines and findings to provide an in-depth, explorable response. This will be the main feature of the `@src/pages/Spyglass/Spyglass.tsx` page. The UI will intertwine LM output with raw excerpts from results, reflecting this deeper granularity.

### 2.2. UI/UX and Component Development

- **Main Spyglass Page (`@src/pages/Spyglass/Spyglass.tsx`)**:
  - Will be the primary interface for "Glimpse Mode" and "Deep Focus Spyglass".
  - Will feature the redesigned "Guided Survey" layout where findings are presented as full-width content blocks.
  - Will include an expanded version of the new Scope Builder UI component.
- **Sidebar Search**:
  - The sidebar will house the "Simple Search" functionality.
  - It will integrate a new, abstract **Scope Builder UI Component** for filtering.
  - It will feature a "slimmed-down" version of "Glimpse Mode".
  - It will include an action to "Export to Spyglass," sending the current sidebar search and scope to the main Spyglass page for a "Deep Focus" query.
- **Abstract Scope Builder UI Component**:
  - A new, reusable component will be built for defining search scopes.
  - It must be designed to work effectively in both the confined space of the sidebar and the more spacious layout of the main Spyglass page.
  - It will manage filtering by tags, rabbitholes, dates, and other criteria defined in the `IConnectableSearchQuery` interface in `@app/services/Search.ts`.
  - It must gracefully handle a large number of filter options (e.g., dozens of tags).
  - This will replace and enhance the existing `@src/components/Display/Interactions/Tags/TagsFilter.tsx`.

### 2.3. Spyglass History & Records

- **Functionality Fix**: Ensure the automatic saving of Spyglass queries is fully functional. Investigate and resolve any issues in `@src/hooks/useSpyglassService.ts` and the `/api/search/spyglass/save` endpoint.
- **History UI (`@src/pages/Spyglass/Spyglass/Records.tsx`)**:
  - The UI for browsing historical queries must be polished and improved.
  - It must be clearly accessible from the main Spyglass page.
- **Record Display (`@src/pages/Spyglass/Spyglass/Record.tsx`)**: Ensure that displaying a single, historical Spyglass record is working correctly and uses the new, polished UI components.

### 2.4. Conversational Context (Follow-up Questions)

- The conversational capabilities of Spyglass will be enhanced.
- The system will be updated to maintain context over multiple follow-up questions, moving beyond the current limitation of only remembering the single immediate parent query.

## 3. Backend Requirements

- **Spyglass Service (`@app/services/Spyglass.ts`)**:
  - The service will be modified to support the new three-tiered search model.
  - The LLM response structure will be updated to produce the data needed for the "Guided Survey" UI (full-width blocks, distinct findings).
- **Search Service (`@app/services/Search.ts`)**:
  - Verify that the search scope interface (`IConnectableSearchQuery`) is robust and can support the new abstract Scope Builder component.

## 4. Out of Scope

- This track will not involve creating new, foundational AI models. It will focus on changing the prompts, backend logic, and UI that utilizes the existing models.
- Architectural changes to application areas not directly related to Search and Spyglass.
