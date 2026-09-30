# Constellation

Constellation is the spatial workbench for understanding and acting on a knowledge base. It should
help a person discover structure, form a meaningful set of knowledge, and send that set into a
workflow. It is not primarily a decorative graph, a complete database browser, or a second file
manager.

This document owns the durable product and information architecture for the Constellation domain.
Delivery status and open implementation work live in [TODO.md](./TODO.md). Cross-application drag,
drop, and set-action contracts are owned by
[INTERACTIONS.md](../../core/interactions/INTERACTIONS.md).

## Product promise

Constellation turns relationships in the knowledge base into useful decisions and actions. A useful
session should normally answer at least one of these questions:

- What is here, and what part of it am I looking at?
- What is related to this thought beyond the links I already made?
- How did these ideas form a traceable line of thought?
- Which items do I want to act on together?
- What can I do with this selection now?
- How does another person or organization's knowledge overlap with mine?

The graph is one representation of those answers. It is not the product by itself.

## Core jobs to be done

### Control the knowledge landscape

The user can define the landscape before exploring it:

- filter by tag, time range, Rabbithole, item type, or access relationship;
- choose a perspective such as their own graph, a friend's graph, or an organization's graph;
- understand which filters and perspective are active;
- search for a known node or topic without losing the spatial context;
- reset to a comprehensible default.

Filters define the graph's **scope**. Scope is distinct from selection: scope says what is available
for consideration, while selection says what the user intends to act on.

### Discover relationships

Constellation supports several relationship layers, and the interface must name which layer is being
shown:

- **Explicit relationships** are durable connections created by a user.
- **Structural relationships** include tags, Rabbithole inclusions, excerpt references, and shares.
- **Semantic relationships** are computed from embeddings and represent conceptual proximity. They
  are exploratory until the user deliberately creates an explicit connection.
- **Narrative paths** are ordered, explainable routes produced through Spyglass. They should retain
  the query and reasoning that made the path meaningful rather than appearing as unexplained graph
  edges.
- **Graph traces** are deterministic, temporary routes through loaded explicit and structural edges
  between members of a Working Set. They expose existing connectivity and never create a persisted
  relationship.
- **Social relationships** describe ownership, sharing, and overlap between the current user and a
  friend or organization.

A user must be able to distinguish computed evidence from persisted relationships. Semantic and
narrative overlays must never silently create explicit connections.

### Build and use a selection

A selection is a named or unnamed working set of graph nodes. It can be assembled by clicking,
cluster traversal, search results, a semantic neighborhood, a Spyglass result, a social overlap, or a
workflow handoff from another page.

The selection is a first-class workflow object, not just visual highlight state. From it, a user can:

- create a Rabbithole;
- apply or remove a tag;
- create connections between compatible items;
- use the set as focused context for a Spyglass prompt;
- inspect, remove, or add individual members;
- eventually save, name, share, or export the set.

Selections handed off from another workflow should preserve provenance when available. For example,
a Spyglass handoff may carry its query, run identifier, result order, and a human-readable label. The
Constellation should show that provenance and allow the user to refine the set without destroying its
origin.

### Organize through direct manipulation

The organizer should be an active work surface, not merely a list of selected nodes. Dragging one
Paper item onto another expresses an attempt to create or remove a relationship:

- connectable onto connectable creates an explicit connection;
- connectable onto tag, or tag onto connectable, applies the tag to the connectable;
- connectable onto Rabbithole, or Rabbithole onto connectable, includes the connectable;
- tag onto Rabbithole, or Rabbithole onto tag, includes the tag in the Rabbithole;
- unsupported combinations explain why they cannot be related instead of failing silently.

Relationship direction is determined by the domain model, not drag direction. A tag describes a
connectable, and a Rabbithole includes an item or tag, regardless of which representation was dragged.
Rabbithole inclusion is not treated as bidirectional in storage.

The organizer should also accept a whole selection as a source when a bulk action is valid. Bulk
operations must preview their effect, exclude invalid members explicitly, and report partial failure.
All drag actions need a keyboard-accessible action-menu equivalent.

## Left sidebar information architecture

The left sidebar is the control and dispatch surface for the current landscape. It uses a staging-area
model with two top-level views so global exploration and an active working set do not compete for
vertical space. The **Explore** view is the default. The **Working Set** view retains a visible item
count in its tab even while Explore is active.

Hierarchy comes from typography, spacing, and lightweight dividers rather than nested card surfaces.
Both views align to the sidebar's own horizontal padding.

### Explore

Explore owns orientation, scope, and temporary relationship lenses. Its order is:

1. perspective control;
2. landscape status, filters, and reset controls;
3. conditional perspective details.

Perspective is the highest-level control because it changes the landscape being examined. Landscape
status includes:

- current perspective: Mine, Friend, or Organization;
- active scope and removable filter chips;
- compact node/relationship counts;
- clear or reset action;
- loading, empty, permission, and incomplete-embedding status.

The application-wide right sidebar owns finding so Constellation does not introduce a second search
controller. On Constellation it additionally provides:

- direct node/topic search;
- Smart and Spyglass search modes;
- result evidence and similarity;
- actions to focus the graph or turn results into the current Working Set.

Semantic neighbors are a secondary action on an embeddable node representation, including its graph
context menu and Paper representation. The resulting overlay is ephemeral, visually distinct, and
may gently influence layout while active.

Semantic-neighbor controls are contextual to a targeted node or current search rather than a permanent
global mode beside unrelated landscape controls.

### Working Set

The Working Set is a staging area for the current selection:

- selection title or provenance and item count;
- compact, transparent Paper representations with a subtle boundary and no per-row removal clutter;
- one secondary clear-selection control;
- a persistent bulk-action bar for create Rabbithole, apply tag, connect, and workflow dispatch;
- a deterministic trace action for revealing paths between two or more selected nodes;
- organizer drop targets and validation feedback.

The list may scroll independently at large selection sizes while its bulk-action bar remains visible.
It is replaced with an instructive empty state when no nodes are selected and must not become an
unbounded duplicate of the graph.

### Perspective details

Context that is only relevant to a non-default landscape:

- friend or organization identity;
- owned by them, shared by them, shared with them, and overlapping with me;
- permissions and provenance;
- controls for returning to the user's own graph.

This information should not occupy permanent space in the default personal view.

## Paper design language

Sidebar work should use the existing Paper system in
`src/core/design/components/Paper/` before introducing new presentation primitives. The intended
mapping is:

- Paper titles, eyebrows, cards, and insets establish hierarchy;
- Paper inputs and search results power finding and tracing;
- Paper things, tags, and Rabbitholes represent knowledge objects consistently;
- Paper chips and segmented controls represent scope, modes, and perspectives;
- Paper buttons express workflow actions;
- Paper selection patterns support pickers and set construction;
- Paper context menus expose secondary and keyboard-equivalent actions.

Mantine remains an implementation dependency, but domain views should not invent a parallel visual
language when a Paper primitive expresses the same role. New Paper primitives should be general,
composable, and documented by their behavior rather than tailored only to Constellation.

## Semantic landscape

Semantic exploration is a temporary lens over the base graph.

When the lens is active, choosing an embeddable node should reveal a bounded set of accessible nodes
ranked by raw cosine similarity. The overlay should:

- show similarity strength visually and numerically;
- respect the active scope and access rules;
- identify explicit connections that already exist;
- avoid duplicate-looking edges when a pair is both explicitly and semantically related;
- offer a deliberate action to persist a useful relationship;
- clear or replace cleanly when the source node or scope changes;
- explain missing or stale embeddings without presenting an application error.

The existing connection-recommendation behavior may blend a node embedding with its neighborhood.
That is a different job from raw semantic inspection and should retain a distinct API and label.

Tags and Rabbitholes may later act as semantic sources through their own embeddings or a centroid of
their contents. They are outside the initial node-to-node semantic lens unless the source and scoring
method can be explained clearly.

## Spyglass integration

Spyglass is the reasoning and narrative layer for Constellation. Integration should support both
directions:

- Constellation sends a selection and active scope into a deep-focus Spyglass prompt.
- Spyglass sends an ordered result set or narrative path back into Constellation as a selection.

A returned path is more than a list of IDs. It should preserve sequence, the originating question,
the reason each step follows the previous one, and references to the underlying Spyglass run. The
graph may visualize that sequence, while the sidebar provides the readable explanation.

## Social perspectives

Friend and organization exploration must distinguish perspective from access. Selecting another
perspective changes whose landscape is being examined; it does not imply ownership or edit rights.

At minimum the interface should distinguish:

- items the other party owns;
- items the current user owns;
- items shared in either direction;
- direct structural or semantic overlap;
- the current user's access level.

The default social visualization should answer a relationship question, not simply add every person
as another node. User and organization nodes are useful anchors when their edges have an understandable
meaning.

## State and lifecycle invariants

- Base graph data, temporary overlays, scope, focus, and selection are separate state concepts.
- Changing a semantic or narrative overlay does not mutate the persisted graph.
- Navigating between supported workflows should not discard an intentionally handed-off selection.
- Clearing a selection does not clear scope, and clearing scope does not silently clear selection.
- Every rendered edge has loaded, authorized endpoints.
- Bulk and drag actions use the same domain operations as their non-graph equivalents.
- The SVG and WebGL renderers should receive equivalent semantic state and behavior.
- Large result sets are bounded; the sidebar and graph never attempt to render the entire database by
  default merely because it is accessible.

## Boundaries

Constellation owns graph-oriented composition, graph interaction, sidebar workflow presentation, and
translation of graph gestures into domain intents. It does not own:

- embedding generation or vector-index lifecycle;
- the core implementation of tagging, connecting, including, sharing, or authorization;
- Spyglass reasoning and persistence;
- reusable Paper primitives;
- the cross-application drag payload and relationship-resolution contract.

Those capabilities are consumed through explicit services and interaction contracts so the same
actions behave consistently elsewhere in the application.
