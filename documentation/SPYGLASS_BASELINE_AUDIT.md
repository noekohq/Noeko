# Spyglass Baseline Audit

**Date:** July 28, 2026  
**Branch:** `feat/introduce-end-to-end-testing`  
**Environment:** Local development database, OpenAI LM and embeddings providers  
**Viewports:** Desktop default and mobile `390 × 844`

## Scope

This baseline followed the real user path rather than seeding records directly:

1. Reset and log in to the local superuser account.
2. Create three related notes through Quick Capture.
3. Run Glimpse from the desktop search sidebar.
4. Attempt to promote that Glimpse result to Deep Focus.
5. Run Deep Focus from the dedicated Spyglass page.
6. Submit a contextual follow-up question.
7. Inspect citations, saved history, and record replay.
8. Repeat the dedicated Glimpse and replay/history experience at a mobile viewport.
9. Review browser runtime errors and responsive layout behavior.

The audit corpus covered a fictional “Atlas weekly learning cycle”:

- Monday-to-Friday operating cadence
- Leading and outcome evidence measures
- Failure modes and recovery rules

The account also contained unrelated Noeko and guitar notes, providing useful retrieval
distractors.

## Executive Baseline

The core intelligence has a good foundation. Both dedicated Glimpse and Deep Focus:

- Retrieved all three relevant Atlas notes and excluded obvious distractors.
- Produced grounded, coherent responses.
- Preserved context for a useful follow-up.
- Persisted dedicated-page runs to history.
- Replayed saved Deep Focus records correctly.
- Rendered readable response structures on desktop and mobile.

The largest weaknesses are in the interaction shell around that intelligence. Mode
transitions are unreliable, mode state is ambiguous, citations do not visibly reveal
their source, loading feedback is weak, and fixed mobile controls obscure content.
There are also significant React runtime warnings that need to be resolved before
visual refinement.

## Critical and High-Priority Findings

### P1 — Glimpse-to-Deep transition changes the URL but does not start Deep Focus

**Reproduction**

1. Run a Glimpse query in the desktop right sidebar.
2. Wait for the complete map.
3. Select **Deep Focus**.

**Observed**

- The URL changes to `/spyglass?...&deep=true`.
- The completed Glimpse result remains on screen.
- No new loading state, request, or Deep response begins.
- Reloading the URL displays the dedicated Spyglass form, but the user must submit
  the query again manually.

**Impact**

The primary escalation path between the two modes appears successful at the URL level
while silently doing nothing. This substantially damages trust in a core flow.

### P1 — React update loop during Spyglass/mobile navigation

The browser logged dozens of:

> Maximum update depth exceeded

These occurred during the responsive Spyglass journey and dominated the console. The
same session also logged repeated empty-query submissions, invalid nested `<div>` /
`<p>` markup, and a missing unique list key.

**Impact**

Even when the UI remains usable, this suggests uncontrolled rerenders and unstable
effects. It can contribute to jank, wasted work, state races, and intermittent failures.
This should be diagnosed before larger component redesigns.

### P1 — Mobile fixed controls obscure response content

On a `390 × 844` viewport:

- The Deep Focus bottom navigation overlaps the first Key Findings card.
- The Glimpse follow-up composer covers much of the “Start Here” card.
- Long results do not provide enough bottom padding to keep content clear of fixed
  controls.

**Impact**

Important evidence and navigation content is visually blocked. The issue becomes worse
on shorter devices and when the keyboard is open.

### P1 — Citation interaction gives no visible source context

Deep Focus rendered numbered citation buttons and the numbers were internally
consistent. Selecting citation `1` only changed its active outline. No source preview,
excerpt, title, popover, side panel, scroll target, or navigation was visibly presented.

**Impact**

Citations technically exist but do not complete their trust-building job. A user cannot
easily answer “which note supports this statement?” or inspect the quoted evidence.

### P1 — Sidebar Glimpse did not appear in history

The completed desktop-sidebar Glimpse query was absent from Spyglass History. A later
Glimpse run from the dedicated `/spyglass` page was saved immediately and replayable.

**Impact**

Persistence depends on the entry surface, even though both experiences present
themselves as Spyglass.

## Medium-Priority UX Findings

### P2 — Mode state is difficult to understand

The dedicated form always displays a **Deep Focus** chip:

- Inactive chip means the pending run will be Glimpse.
- Active chip means the pending run will be Deep Focus.
- The control has no `aria-pressed` or equivalent state.
- Glimpse is not named anywhere on the form.

The user must infer both the current mode and the action of the chip.

**Direction**

Use an explicit two-option mode selector with a short promise for each mode, for example:

- **Glimpse** — fast map of your notes
- **Deep Focus** — comprehensive cited synthesis

### P2 — Loading states are visually weak and not phase-oriented

Observed copy included “Starting analysis,” “Searching your ideas,” and “Generating
glimpse mode map.” The dedicated Deep loading screen was mostly an empty, very
low-contrast canvas with the query title and a faint status line.

The underlying pipeline has meaningful phases, but the UI does not use them to set
expectations:

1. Understanding the question
2. Searching notes
3. Reading sources / extracting findings
4. Writing the response
5. Saving to history

### P2 — Desktop sidebar is too narrow for generated responses

The right sidebar works for search results but is cramped for a generative answer:

- The full query is clipped inside the search input.
- Headings wrap aggressively.
- The answer requires scrolling inside a narrow column while the main canvas remains
  largely unused.
- The “Deep Focus” transition moves toward a dedicated page but currently fails.

**Direction**

Treat sidebar Glimpse as a compact preview with a deliberate “Open full analysis”
transition, or allow the panel to expand. Avoid rendering a full report in a search-sized
column.

### P2 — Sticky follow-up composer competes with the answer

The follow-up field appears as a large floating block:

- On desktop it covers the lower portion of the answer while scrolling.
- On mobile it obscures cards and connections.
- It remains visually dominant even before the user signals follow-up intent.

**Direction**

Use a compact collapsed prompt bar, reserve safe-area padding below the response, and
expand only on focus.

### P2 — History rows are not semantic controls

History entries are clickable generic containers rather than links or buttons. Their
arrow controls have no accessible names. Mobile query titles are heavily truncated, and
quotes are displayed around every query.

Replay itself works correctly once a row is activated.

### P2 — Dynamic placeholders change the textbox’s accessible identity

Search placeholders changed between values such as “Uncover a mystery,” “What if…?”,
“Summon the knowledge!”, and “Where to next?” while interacting. Because there is no
persistent label, the textbox’s accessible name changes during entry.

This is charming visual copy but an unstable accessibility contract and makes the
search surface harder to recognize consistently.

### P2 — Quick Capture has a surprising two-step submission

Pressing Enter after writing a thought does not create a note. It reveals **Task** and
**Idea** as a second decision step. Selecting **Idea** disables the entire control for
roughly two to five seconds while derived fields are generated, then closes the menu.

This is adjacent to Spyglass rather than part of it, but it affects the “add knowledge,
then ask it questions” journey.

## Response Quality Baseline

### Glimpse

**Strengths**

- Correctly selected the operating-cycle note as “Start Here.”
- Grouped evidence and failure modes into useful themes.
- Exposed cross-note connections.
- Excluded unrelated notes.
- Produced a concise, grounded narrative.

**Weaknesses**

- For the broader desktop query that explicitly requested a practical checklist, the
  Glimpse response described which notes support a checklist rather than presenting a
  usable checklist.
- Resource cards repeat long note content and can dominate the mobile viewport.
- Relationship labels such as “Foundation” and “Questions” are useful but not always
  aligned with the content; the failure-mode section is guidance rather than a question.

### Deep Focus

**Strengths**

- Excellent structure for the test query: overview, cadence, evidence measures, failure
  modes, and a day-by-day checklist.
- Every substantive claim had citations.
- The answer stayed within the seeded notes.
- Metadata (“Reading 3 sources • 12 findings”) established useful scope.
- Markdown copy and download actions were available.
- The follow-up “Condense this into the three most important guardrails” correctly used
  prior context and produced a focused three-item answer.

**Weaknesses**

- Citation numbers represent many findings rather than a small, stable source list,
  creating dense clusters such as four citations after one sentence.
- Disabled checkboxes look actionable while functioning only as decoration.
- “Key Findings” repeats source-level metadata after a long answer without clearly
  explaining what the user can do with those cards.
- Source inspection is not discoverable or functional from citation selection.

## Baseline Timing

Approximate observed wall-clock times with real OpenAI calls:

- Quick Capture note creation: 2–5 seconds per note
- Glimpse: about 15 seconds
- Deep Focus: about 15 seconds
- Deep follow-up: about 15 seconds

The duration is acceptable for Deep Focus if progress is clear. It feels longer than
necessary in Glimpse because the loading UI communicates little useful progress.

## What Worked End to End

- Local authentication after password reset
- UI-created notes with generated titles and persisted embeddings
- Semantic/hybrid retrieval of paraphrased Atlas queries
- Dedicated Glimpse generation
- Dedicated Deep Focus generation
- Deep citations rendered and numbered
- Contextual Deep follow-up
- Deep and dedicated Glimpse history persistence
- Saved-record replay
- Mobile rendering of both response types
- Markdown copy/download controls present

## Recommended Audit-to-Implementation Order

1. Fix the React update loop, empty-query effect, invalid markup, and missing list key.
2. Fix Glimpse-to-Deep navigation and unify persistence across entry surfaces.
3. Establish one explicit mode model shared by sidebar, dedicated page, URL, and history.
4. Redesign citation interaction around source previews and verbatim evidence.
5. Correct fixed/sticky layout and safe-area spacing on mobile.
6. Turn loading into a clear phase-based progress experience.
7. Simplify the desktop sidebar into a preview or make it expandable.
8. Refine response templates: source-based citations, actionable Glimpse output, and
   clearer Key Findings behavior.
9. Add accessibility names and semantics to history rows, icon navigation, mode controls,
   and search fields.

## Suggested Next Audit Pass

The next pass should isolate each issue with component-level evidence and map it to code:

- Profile the maximum-update-depth loop and identify the triggering effect.
- Trace the sidebar Deep Focus link and compare it with dedicated-page submission.
- Compare sidebar and dedicated-page save callbacks.
- Inspect citation click handlers and intended source-preview surface.
- Measure fixed element heights against response padding at common mobile breakpoints.
- Audit keyboard navigation, focus order, screen-reader names, and reduced-motion behavior.
- Exercise empty results, partial streams, API failures, refresh mid-stream, and very long
  notes.
