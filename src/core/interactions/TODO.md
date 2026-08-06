# Cross-application interactions TODO

This roadmap tracks the consolidation described in [INTERACTIONS.md](./INTERACTIONS.md). Shared
contracts and the pure relationship resolver now live here; UI adapters and mutations remain
distributed across the application.

## Inventory and decisions

- [ ] Inventory every drag producer, its MIME types, payload shape, and global-state usage.
- [ ] Inventory every drop target, accepted types, mutation function, refresh behavior, and feedback.
- [ ] Inventory set-producing workflows: graph selection, search, Spyglass, tags, Rabbitholes, and
      social perspectives.
- [x] Use `application/vnd.noeko.interaction.v1+json` as the canonical MIME type, prefer it when
      reading, conservatively accept legacy JSON, and emit only the canonical format.
- [ ] Decide the stable direction convention for connectable-to-connectable connections.
- [ ] Decide whether bulk operations require a preview always or only above a size/risk threshold.
- [ ] Decide which interaction and selection state survives route changes, refresh, and sessions.

## Shared contracts

- [x] Add typed, versioned `KnowledgeRef`, `InteractionPayload`, and provenance types.
- [x] Add runtime validation for serialized interaction payloads and data read from `DataTransfer`.
- [ ] Replace the ambiguous dragged string with a typed interaction session while preserving a
      migration path for existing consumers.
- [x] Keep editor text selection and graph/set selection as separate named contracts.
- [x] Add serialization and parsing helpers; producers and targets should not hand-roll JSON.
- [x] Add a selection handoff contract that can carry ordered IDs and Spyglass provenance.
- [x] Add a React-free selection store plus a global, identity-scoped provider with optional
      session persistence.

## Relationship resolver

- [x] Implement a pure resolver for source, target, canonical direction, accepted members, no-ops,
      rejected members, and reasons.
- [x] Cover connectable-to-connectable connections.
- [x] Cover connectable/tag tag application in both gesture directions.
- [x] Cover connectable/Rabbithole inclusion in both gesture directions.
- [x] Cover tag/Rabbithole inclusion in both gesture directions.
- [x] Return explicit unsupported results for all other combinations.
- [ ] Define adapter interfaces for connect, apply tag, and include operations without moving domain
      ownership into this module.

## Reusable source and target behavior

- [ ] Add a reusable Paper drag-source adapter that emits the canonical payload and manages transient
      interaction state.
- [ ] Add a reusable drop-target hook that resolves eligibility and exposes idle, eligible, partial,
      invalid, and pending states.
- [ ] Provide consistent result notifications and accessible announcements.
- [ ] Respect reduced-motion preferences in drag previews and target transitions.
- [ ] Provide action-menu and keyboard alternatives that invoke the same resolver.
- [ ] Support dragging or dispatching an entire selection with a useful summary preview.

## Migrate existing consumers

- [ ] Migrate `PaperThing`.
- [ ] Migrate legacy idea, source, task, and excerpt drag producers.
- [ ] Migrate connection manager and idea-connection dropzones.
- [ ] Migrate tag application dropzones.
- [ ] Migrate Rabbithole inclusion dropzones.
- [ ] Migrate Constellation `GraphOrganizer` after its sidebar information architecture is established.
- [ ] Remove compatibility parsing only after all producers and targets use the canonical contract.

## Reliability and safety

- [ ] Make repeated connect, tag, and include operations idempotent or return a consistent no-op.
- [ ] Define partial-failure and retry behavior for bulk mutations.
- [ ] Ensure query invalidation updates all affected surfaces without broad application reloads.
- [ ] Verify server authorization for every adapter operation.
- [ ] Clear interaction state on drop, drag end, Escape, navigation, unmount, and browser cancellation.
- [ ] Prevent full record content or sensitive metadata from entering browser drag payloads.

## Quality gates for implementation

- [ ] Pure resolver behavior has focused unit coverage for the relationship matrix and invalid cases.
- [ ] Critical domain mutations have backend integration coverage against the dedicated test database.
- [ ] Representative Paper sources and domain targets have user-interaction coverage.
- [ ] Keyboard behavior, accessible announcements, and cancellation are verified.
- [ ] Typecheck and relevant Bun test suites pass.

## Future directions

- [ ] Saved or named selections.
- [ ] Undo for relationship mutations initiated through the interaction layer.
- [ ] Multi-target dispatch, such as applying a set to several tags or Rabbitholes.
- [ ] Touch-first direct manipulation that does not depend on HTML5 drag events.
- [ ] Cross-window or cross-device set handoff through a persisted workflow record.
