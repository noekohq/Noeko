# Constellation TODO

This document tracks delivery against [CONSTELLATION.md](./CONSTELLATION.md). It is intentionally a
roadmap rather than a second product specification.

## Verified current state

- [x] The snapshot API and both graph renderers display ideas, sources, tasks, excerpts, tags,
      Rabbitholes, and their persisted structural relationships.
- [x] Tag, date, and Rabbithole scope filters flow from the existing search UI to the snapshot query.
- [x] Search can highlight and focus matching graph nodes.
- [x] Graph selection is globally available through `GraphContext` and supports direct and cluster
      selection.
- [x] Selected nodes are represented with Paper items in `GraphOrganizer`.
- [x] A selected set can seed a new Rabbithole from the graph context menu.
- [x] Stored embeddings and cosine-similarity queries already support connection recommendations.
- [x] Connection recommendations blend a connectable embedding with the current explicit-neighborhood
      centroid and fall back to the connectable embedding when no valid centroid is available.
- [x] A prop-driven Paper sidebar shell represents the documented Explore and Working Set staging
      model, including conditional Perspective details.
- [x] A dedicated semantic-neighborhood backend returns filtered raw-cosine neighbors without
      changing connection-recommendation semantics.
- [x] The left sidebar is organized around the hierarchy of jobs in `CONSTELLATION.md` and uses the
      Paper component language for landscape, discovery, and selection controls.
- [x] Shared records and normalized item-to-counterpart share edges can be loaded into the active
      filtered snapshot through one user-facing Shared mode.
- [x] Semantic neighbors render as a temporary, visibly distinct overlay in both SVG and WebGL.
- [x] A typed workflow selection can enter Constellation, reconcile against the loaded snapshot,
      retain provenance, and be refined from the sidebar.
- [x] Right-sidebar search can replace the Working Set while retaining search provenance and no
      duplicate left-sidebar search controller remains.
- [x] Working Set actions support choose-or-create bulk tagging, anchored connection, Rabbithole
      creation, and deterministic graph tracing from the sidebar or blank-canvas context menu.
- [ ] The organizer performs relationship or bulk actions.
- [ ] A selection can be handed between Spyglass and Constellation with provenance.
- [ ] Friend and organization perspectives are complete.

## Now: establish the workbench

### Left sidebar information architecture

- [x] Replace the node-manager-first layout with Landscape, Selection, and conditional Perspective
      sections while leaving application-wide search in the right sidebar.
- [x] Inventory the existing Paper primitives against the proposed sidebar roles before creating any
      constellation-only UI primitives.
- [x] Build composable, prop-driven section shells without coupling them to global workflow state.
- [ ] Define responsive behavior for collapsed desktop, open desktop, and mobile sidebar states.
- [x] Add intentional landscape loading, empty-selection, search-empty, and missing-embedding states.
- [ ] Add explicit empty-scope and permission states once non-personal perspectives can be selected.
- [x] Keep shell result lists bounded and provide a deliberate expansion callback.
- [x] Separate global exploration from selection management with Explore and Working Set tabs.
- [x] Keep the selected-item count visible from Explore and bulk actions visible while the Working
      Set list scrolls.
- [x] Flatten nested sidebar card surfaces and use lightweight Paper rows for selected nodes.

### Complete GitHub issue #85

- [x] Filter by tags.
- [x] Filter by created, updated, or viewed time window.
- [x] Add one user-facing Shared mode that drives `showShared`, friend loading, and share-edge loading.
- [x] Keep unfinished Friend and Organization perspective controls out of the live workbench until
      they have real identity selection and graph-scope semantics; Shared remains an access scope,
      not a substitute perspective.
- [x] Normalize outgoing shares as item-to-recipient and incoming shares as item-to-owner for graph
      display.
- [x] Apply active scope filters to shared-item and share-edge queries.
- [x] Represent the active Shared mode as removable scope and include it in status counts.

### Selection as a workflow object

- [x] Define a route-safe selection handoff contract containing IDs, origin, optional label, and
      provenance.
- [x] Reconcile graph selection with the unrelated text `selection.current` currently held by
      `LandscapeContext`; do not overload one value with two meanings.
- [x] Add sidebar and blank-canvas actions for Create Rabbithole, Apply tag, anchored Connect, and
      deterministic Trace.
- [x] Preserve successful bulk members, retain the Working Set, and report partial failures.
- [x] Keep Working Set rows and action controls stable at narrow sidebar widths, including explicit
      description fallbacks and non-overflowing action layout.
- [x] Clear selection-owned trace and semantic overlays when the Working Set is cleared.
- [x] Focus the resulting tag or connection anchor after successful bulk actions and distinguish
      direct pair connection from choose-or-create anchored connection.
- [x] Add Use in Spyglass as an explicit Working Set dispatch and make the resulting ID scope
      visible and removable before querying.
- [x] Preserve an intentional selection across routes and authenticated browser-session navigation;
      Spyglass still needs to produce and consume the handoff explicitly.
- [ ] Decide whether selections remain ephemeral, may be named/saved, or both.

## Next: semantic and narrative exploration

### Semantic-neighbor lens

- [x] Add a dedicated pure-cosine semantic-neighborhood service/API rather than changing the blended
      connection-recommendation contract.
- [x] Accept the active graph filters, bound `limit` and `threshold`, globally sort cross-table
      results, and apply one final limit.
- [x] Include already-connected nodes by default and expose their explicit-connection state in
      results; callers may opt out.
- [x] Add an ephemeral semantic edge type with similarity metadata.
- [x] Add the sidebar lens control, traceable result list, loading state, and clear/replace behavior.
- [x] Style semantic strength consistently in SVG and WebGL without making computed edges look
      persisted.
- [ ] Add an explicit action for turning a semantic suggestion into a durable connection.
- [x] Handle missing embeddings as an informative empty state.
- [ ] Define stale-embedding detection and refresh behavior.
- [x] Make semantic exploration a secondary node/Paper action and apply a gentle temporary layout
      pull while its distinct overlay is active.

Known debt in the reusable similarity path:

- [x] Fix the inverted `rabbitholeId` validation on `GET /graph/:thingId/similar`.
- [x] Standardize connection recommendations on `similarity` across the service and client.
- [x] Apply result limits after merging idea, source, task, and excerpt results, not once per table.

### Spyglass paths

- [ ] Define the Spyglass-to-Constellation handoff DTO: run ID, query, ordered node IDs, step reasons,
      and label.
- [ ] Let a Spyglass result set become the current selection.
- [ ] Render an ordered narrative path separately from ordinary graph connections.
- [ ] Provide readable step explanations and source attribution in the sidebar.
- [ ] Send a selection and scope into a new or existing deep-focus Spyglass prompt.
- [ ] Decide how a user saves or revisits a generated path.

## Next: organizer interactions

- [x] Adopt the typed payload and relationship resolver described in
      [the interactions roadmap](../../core/interactions/TODO.md).
- [ ] Make organizer Paper items draggable without interfering with click, focus, or graph-node
      positioning gestures.
- [ ] Support connectable-to-connectable connection creation.
- [ ] Support connectable-to-tag and tag-to-connectable tag application.
- [ ] Support connectable-to-Rabbithole and tag-to-Rabbithole inclusion in either drag direction.
- [ ] Add valid-target, invalid-target, pending, success, and partial-failure feedback.
- [ ] Provide action-menu and keyboard equivalents for every drag operation.
- [ ] Allow a whole selection to be dragged or dispatched when the target supports a bulk action.
- [ ] Refresh graph data and selection representations after successful mutations without resetting
      unrelated scope or layout state.

## Later: social landscapes

- [ ] Define perspective selection for Mine, Friend, and Organization.
- [ ] Distinguish perspective identity from permissions and ownership.
- [ ] Show owned by them, shared by them, shared with them, and overlapping with me.
- [ ] Decide whether social overlap defaults to explicit, structural, semantic, or combined evidence.
- [ ] Add organization nodes and membership/ownership relationships only when their meaning is clear.
- [ ] Define privacy behavior for semantic comparisons across separately owned graphs.
- [ ] Support turning a social overlap result into a selection or Spyglass prompt.

## Quality gates for implementation

- [ ] Backend relationship and semantic work has integration coverage against the dedicated test
      database with deterministic embedding vectors.
- [ ] Sidebar work has user-interaction coverage that mocks network boundaries rather than child
      components.
- [ ] Shared and social queries prove authorization and endpoint completeness.
- [ ] SVG and WebGL behavior remains equivalent for selection, overlays, and organizer actions.
- [ ] Drag/drop has a keyboard-accessible equivalent and announces success or failure.
- [ ] Typecheck and the relevant Bun test suites pass.

## Open decisions

- [x] Semantic neighbors are a secondary node action; ordinary node selection does not run semantic
      exploration.
- [ ] Should semantic results be limited to nodes already present in the active snapshot, or may they
      temporarily introduce accessible out-of-scope nodes?
- [ ] Is a friend/organization graph a replacement perspective, an overlay on the user's graph, or a
      switchable combination of both?
- [ ] What selection size requires confirmation before a bulk mutation or deep-focus prompt?
- [ ] Which selection provenance must survive refresh, browser navigation, and a new session?
