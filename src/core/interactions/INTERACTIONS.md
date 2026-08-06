# Cross-application interactions

This module owns the shared contract for carrying knowledge objects and sets between surfaces and
resolving a user gesture into a domain action. Its first focus is drag and drop, but the contract must
also support click menus, keyboard actions, command surfaces, and workflow handoffs.

Typed payload contracts, serialization, runtime validation, and pure relationship resolution now
live in this module. Consumer state and adapters remain distributed across `LandscapeContext`,
`GraphContext`, Paper things, connection managers, tag pages, Rabbithole dropzones, search, and
Constellation. Work is tracked in [TODO.md](./TODO.md).

## Why this is a core interaction module

Paper owns reusable visual primitives. Domains own operations such as connecting, applying a tag, or
including something in a Rabbithole. Neither should independently define what a cross-application drag
payload means.

This module sits between them:

1. A source surface describes what is being carried.
2. A target describes what it can accept.
3. A resolver maps that pair to a domain intent with a canonical direction.
4. The owning domain operation authorizes and performs the mutation.
5. The interaction layer reports pending, success, no-op, invalid, or partial-failure state.

The same resolver should power drag and drop and its accessible action-menu equivalent.

## Current state and terminology

`LandscapeContext.dragging.current` currently stores only a string ID. Browser drag payloads commonly
store `{ thingId }` under `application/json`. Individual targets parse that payload and choose a
mutation locally. Graph selection is a separate `Set<string>` in `GraphContext`, while
`LandscapeContext.selection.current` represents selected text content.

These are useful beginnings, but the names hide distinct concepts:

- **Dragged payload**: one or more typed knowledge references being carried.
- **Graph selection**: a set of graph-node IDs intended for a workflow.
- **Text selection**: content selected inside an editor.
- **Scope**: constraints on which knowledge is visible or searchable.
- **Intent**: the domain action inferred or chosen for a source/target pair.

The implementation should preserve those distinctions instead of expanding generic `string` or
`selection` fields.

## Payload contract

A transferable payload is versioned, serializable, and useful without loading full records. The
current contract is conceptually:

```ts
type KnowledgeRef = {
  id: string;
  type: "idea" | "source" | "task" | "excerpt" | "tag" | "rabbithole";
};

type InteractionPayload = {
  version: 1;
  kind: "knowledge" | "set";
  items: KnowledgeRef[];
  origin?: {
    surface: string;
    workflowId?: string;
    traceId?: string;
    label?: string;
  };
};
```

The canonical browser MIME type is `application/vnd.noeko.interaction.v1+json`. Readers prefer it and
may conservatively upgrade the legacy `application/json` `{ thingId }` payload when a trusted type is
available. Writers emit only the canonical format so the compatibility period does not expand. Full
knowledge content, embeddings, permissions, and other sensitive record data do not belong in
`DataTransfer`.

The shared in-memory interaction session may additionally track pointer state, a preview, eligible
targets, and pending intent. That transient UI state is not the payload contract and should not leak
into domain services.

## Relationship resolution

Drag direction expresses gesture direction, not storage direction. The resolver determines the
canonical relationship and mutation.

| Source      | Target      | Intent    | Canonical relationship                               |
| ----------- | ----------- | --------- | ---------------------------------------------------- |
| connectable | connectable | connect   | source connectable `connected` to target connectable |
| connectable | tag         | apply tag | tag `describes` connectable                          |
| tag         | connectable | apply tag | tag `describes` connectable                          |
| connectable | Rabbithole  | include   | Rabbithole `includes` connectable                    |
| Rabbithole  | connectable | include   | Rabbithole `includes` connectable                    |
| tag         | Rabbithole  | include   | Rabbithole `includes` tag                            |
| Rabbithole  | tag         | include   | Rabbithole `includes` tag                            |

For this contract, connectable means idea, source, task, or excerpt. Combinations not listed above are
unsupported until a domain explicitly defines their meaning. In particular, visual proximity alone
does not authorize tag-to-tag or Rabbithole-to-Rabbithole relationships.

Connectable connections may be directed in storage even when the initial UI describes them as a
connection. The source/target convention must be stable and inspectable; reversing a drag should not
accidentally produce a semantically different record unless the UI explicitly communicates direction.

## Sets and bulk actions

A set payload carries multiple knowledge references plus optional provenance. A target or command may
accept all, some, or none of the members.

Before mutation, resolution should produce a preview:

```ts
type ResolutionPreview = {
  status: "eligible" | "partial" | "invalid" | "noop";
  intent: string | "mixed" | null;
  accepted: KnowledgeRef[];
  relationships: Array<{
    item: KnowledgeRef;
    intent: string;
    relationship: { type: string; source: KnowledgeRef; target: KnowledgeRef };
  }>;
  rejected: Array<{ item: KnowledgeRef; reason: string }>;
  noops: Array<{ item: KnowledgeRef; reason: string }>;
};
```

Bulk operations should be idempotent where practical. An already-applied tag or already-included item
is a visible no-op, not an unexplained failure. If operations cannot be atomic, the result must report
which members succeeded and failed and make retry behavior safe.

## Source responsibilities

A drag or dispatch source should:

- emit a valid typed payload;
- set the shared interaction session for cross-surface previews;
- provide a meaningful drag image or set summary;
- clear transient state on drag end or cancellation;
- retain the underlying selection unless the completed intent explicitly consumes it;
- expose the same intent through keyboard or action-menu controls.

Paper components may provide these mechanics, but they should receive typed knowledge references and
callbacks rather than infer domain semantics from labels or CSS.

## Target responsibilities

A target should:

- declare accepted reference types or intents;
- ask the shared resolver for a preview rather than parse IDs and choose domain behavior itself;
- prevent the browser drop only when it can participate;
- distinguish valid, partially valid, invalid, and pending states;
- call the canonical domain mutation after confirmation when confirmation is needed;
- refresh affected query state without reloading unrelated application context;
- announce results accessibly and provide actionable error feedback.

Targets must verify authorization server-side. Client eligibility is guidance, not security.

## Interaction feedback

The interaction system should use consistent states across the application:

- **idle**: no transferable payload is active;
- **eligible**: all payload members can produce the displayed intent;
- **partial**: only some members are valid;
- **invalid**: no supported intent exists, with a short reason;
- **pending**: the domain mutation is running;
- **success/no-op/failure**: a terminal result that identifies affected items.

Effects and overlays may vary by surface, but wording and semantics should remain consistent. Reduced
motion settings must be respected.

## Selection and workflow handoff

Drag and drop is only one transport for a set. Spyglass, search, tags, Rabbitholes, and social graph
views should be able to dispatch a selection into Constellation or another workflow through the same
typed reference and provenance concepts.

Handoffs may use global client state, navigation state, or a persisted workflow record depending on
lifetime. The transport choice must not change the meaning of the set. Route transitions should not
silently turn a text selection into a graph selection or discard provenance.

## Boundaries

This module owns:

- transferable knowledge-reference and set types;
- in-memory interaction-session state;
- source/target eligibility and relationship resolution;
- consistent preview and result semantics;
- reusable hooks or adapters that bridge Paper surfaces to domain mutations.

This module does not own:

- the visual design of Paper components;
- graph rendering or Constellation sidebar composition;
- database relationship implementations;
- authorization policy;
- domain query invalidation details;
- editor-native text and node selection behavior.

The module may coordinate those capabilities through explicit adapters, but it should not duplicate
them.

## Invariants

- IDs and types are validated before an intent is resolved.
- Every mutation is authorized by the backend.
- Reversing a gesture does not silently reverse a canonical structural relationship.
- Unsupported combinations never mutate data.
- A drag cancellation never leaves global dragging state active.
- A set action reports rejected, no-op, succeeded, and failed members when those states differ.
- Drag-only functionality has a keyboard and non-drag equivalent.
- The same source/target combination resolves consistently in every surface.
