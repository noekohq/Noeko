# Organizations and shared knowledge

## Status

This document is the detailed design for Noeko organizations. The first vertical slice is now implemented: organizations and graph membership, personal-to-organization idea ownership transfer, organization-owned idea creation, owner/member authorization, durable email invitations, acceptance during sign-in or registration, and owner-managed membership. Resource grant controls, organization-wide filtering, and organization-owned Rabbitholes remain planned.

The living module purpose and delivery status are maintained in [`src/domains/organizations/ORGANIZATIONS.md`](../../src/domains/organizations/ORGANIZATIONS.md) and [`src/domains/organizations/TODO.md`](../../src/domains/organizations/TODO.md).

The recommended first release introduces organizations, many-to-many membership, durable invitations, organization-owned knowledge, and per-resource access. Teams and custom roles are deliberately shaped into the model but deferred until the core permission system is proven.

## Why this belongs in Noeko

Noeko already describes real-time collaboration as a core feature: people should be able to connect personal ideas to shared ideas while retaining their individual knowledge graphs. Organizations provide a durable owner and policy boundary for that shared knowledge. They must not merely group user accounts or duplicate a user's personal workspace.

The GitHub analogy is useful when applied at the correct levels:

| GitHub concept            | Noeko concept                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Personal account          | User and personal knowledge                                                                                                    |
| Organization              | Organization and organization-owned knowledge                                                                                  |
| Organization owner/member | Organization owner/member                                                                                                      |
| Repository                | An organization-owned knowledge resource in the first release; a knowledge space may become the closer container analogy later |
| Repository role           | Resource access role                                                                                                           |
| Outside collaborator      | Non-member with a direct resource grant, deferred until after member grants                                                    |
| Team                      | Organization-scoped group of members, deferred                                                                                 |

GitHub separates organization roles from resource roles, supports base permissions, and allows direct or team-specific resource access. Noeko should copy those boundaries, not GitHub's code-hosting terminology or its full role matrix.

## Current state

The database already uses graph relations, but ownership and sharing assume that the acting principal is always a user:

- `user -> owns -> thing` represents ownership.
- `thing -> shared_with -> user` represents `viewonly` or `editor` access.
- `Authorization` checks direct user ownership, direct user sharing, and limited access inherited through connected or embedded records.
- `FilterQueryBuilder`, model queries, search, graph loading, recommendations, files, and collaboration contain their own variations of the same user-centric predicates.
- The share API only accepts an existing user's ID or email. The access manager only appears to owners and only lists people.
- The existing `/users/invite` endpoint is a superuser-only referral email. It does not persist an invitation or encode a target organization, membership role, expiry, acceptance, revocation, or audit trail.
- Real-time editor authentication correctly asks for `editor` access, but depends on the current user-only authorization resolver.

Important implementation surfaces include:

- `app/services/Authorization.ts`
- `app/lib/query/FilterQueryBuilder.ts`
- `app/database/models/share.ts`
- `app/database/models/ideas/index.ts`
- `app/services/Search.ts`
- `app/services/Graph.ts`
- `app/collaboration/index.ts`
- `app/api/shared.ts`
- `src/core/design/components/Display/Interactions/Access/AccessManager.tsx`

The ownership/access predicates must be centralized before organization behavior is considered complete. Adding organization branches only to the idea API would create inconsistent and potentially unsafe behavior in search, graph traversal, exports, files, and collaborative editing.

## Product rules

1. A user can belong to many organizations, and an organization can have many users.
2. Personal and organization knowledge coexist. Creating or joining an organization does not move or expose personal knowledge.
3. Every owned resource has exactly one owning principal: either one user or one organization.
4. Organization owners administer the organization and have administrative access to every resource it owns.
5. Organization members do not necessarily see every organization resource. The organization's base resource permission determines the default, and explicit grants can add access.
6. Permissions are additive in the first release. When multiple paths grant access, the highest role wins. There are no explicit deny edges.
7. Removing or suspending membership immediately removes membership-derived access. A user-owned resource remains theirs when they leave an organization.
8. Invitations are durable, expiring, revocable, single-use records. A referral link is not an organization invitation.
9. All protected reads and writes use the same authorization service, including WebSocket document access.
10. Ownership transfer and deletion must be explicit, transactional operations with audit events.

## Graph model

```text
user ──member_of { role, status }──> organization
  │                                      │
  └──────────── owns ───────────────┐    └──────── owns ──────────────┐
                                    ▼                                 ▼
                              personal resource                organization resource

user ─────────────── access_grant { role } ────────────────────────────▲

organization_invitation ──targets──> organization
          │
          ├── invitedBy: user
          └── acceptedBy: user?

Future:
user ──member_of_team──> team ──belongs_to──> organization
team ───────────────── access_grant { role } ──────────────────────────▲
```

`user` and `organization` are principals. `team` becomes a third principal only when team grants are implemented. Knowledge records remain resources.

### Organization

Proposed `organization` fields:

| Field                    | Purpose                                       |
| ------------------------ | --------------------------------------------- |
| `id`                     | SurrealDB record ID                           |
| `name`                   | Display name                                  |
| `slug`                   | Stable, unique URL identifier                 |
| `description`            | Optional profile text                         |
| `avatarKey`              | Optional stored asset reference               |
| `baseResourceRole`       | `none`, `viewer`, or `editor`; default `none` |
| `createdBy`              | User who created the organization             |
| `createdAt`, `updatedAt` | Audit timestamps                              |
| `archivedAt`             | Optional soft-archive timestamp               |

Use a globally unique, case-insensitive normalized slug. Reserve system routes and reject slugs that normalize to an existing value.

### Membership

Proposed relation:

```text
user -> member_of -> organization
```

Fields:

| Field                    | Values or purpose       |
| ------------------------ | ----------------------- |
| `role`                   | `owner` or `member`     |
| `status`                 | `active` or `suspended` |
| `createdAt`, `updatedAt` | Audit timestamps        |
| `invitedBy`              | Optional user record    |

Create a unique index on `(in, out)` so a user has at most one membership edge per organization. Membership history belongs in audit events rather than duplicate inactive edges.

The first release should use only `owner` and `member` at the organization level. Resource roles handle resource-specific authority. An `admin` organization role can be added later if a concrete set of delegated organization operations emerges.

Invariants:

- Every active organization has at least one active owner.
- The last active owner cannot leave, be suspended, or be demoted.
- A user cannot accept an invitation into an archived organization.
- Suspending membership blocks all organization-derived access without deleting the edge.

### Ownership

Continue using the existing direction:

```text
principal -> owns -> resource
```

Allow `owns.in` to be a `user` or `organization`. Supported organization-owned resource types should be introduced deliberately. The recommended first vertical slice is `idea`, followed by `task`, `source`, `excerpt`, `user_file`, `tag`, and `rabbithole` as their authorization and lifecycle behavior is audited.

Do not infer ownership from `createdBy`. Store `createdBy` or `createdByUser` as provenance where useful, but authorize through the `owns` relation.

The application must enforce exactly one incoming ownership edge for supported resources. SurrealDB relation constraints and unique indexes should enforce as much of this as the active database version permits; the service transaction must enforce the remainder.

### Resource grants

Introduce a consistently directed relation:

```text
principal -> access_grant -> resource
```

Fields:

| Field                    | Purpose                        |
| ------------------------ | ------------------------------ |
| `role`                   | `viewer`, `editor`, or `admin` |
| `grantedBy`              | User who granted access        |
| `createdAt`, `updatedAt` | Audit timestamps               |

Use a unique index on `(in, out)`. Updating a grant changes the existing edge rather than creating another path with the same principal.

For organization-owned resources in the first release, the grant principal is an active member user. Future iterations may allow teams and outside collaborators. An organization should not grant one of its own resources back to itself; the base permission already expresses that rule.

The existing `shared_with` relation should remain readable during migration. New writes should go through an access-grant service. After all callers use the centralized resolver, migrate existing user shares to `user -> access_grant -> resource` and remove dual-read support in a later release.

### Invitation

An invitation must exist before its recipient necessarily has a user record, so it should be a record rather than a user-to-organization edge.

Proposed `organization_invitation` fields:

| Field                      | Purpose                                                                    |
| -------------------------- | -------------------------------------------------------------------------- |
| `organization`             | Target organization                                                        |
| `emailNormalized`          | Lowercased, trimmed target email                                           |
| `role`                     | Initial organization role; normally `member`                               |
| `tokenHash`                | Hash of a cryptographically random bearer token; never store the raw token |
| `invitedBy`                | Inviting user                                                              |
| `status`                   | `pending`, `accepted`, `revoked`, or `expired`                             |
| `expiresAt`                | Explicit expiry; recommended default seven days                            |
| `createdAt`, `updatedAt`   | Audit timestamps                                                           |
| `acceptedAt`, `acceptedBy` | Acceptance details                                                         |
| `revokedAt`, `revokedBy`   | Revocation details                                                         |

There may be only one pending, unexpired invitation per organization and normalized email. Resending rotates the token and expiry on the existing pending invitation. Acceptance requires an authenticated user whose normalized account email matches the invitation email. Noeko does not currently model verified email addresses; exact account-email matching is the minimum safe first-release rule, and email verification should be considered before external or high-trust deployments.

Acceptance must be transactional and idempotent:

1. Hash and look up the supplied token.
2. Reject revoked, expired, or mismatched invitations without revealing unrelated membership data.
3. If the matching membership already exists, mark the invitation accepted and return the existing membership.
4. Otherwise create the membership edge, mark the invitation accepted, and write an audit event in one transaction.

For a recipient without an account, the link opens registration with an opaque invitation token. Registration creates the account, authenticates it, and then calls the same acceptance operation. The invitation token must not be exchanged for a session and must not bypass the existing terms/privacy acceptance flow.

## Permission model

### Organization capabilities

| Capability                            |                    Member | Owner |
| ------------------------------------- | ------------------------: | ----: |
| View organization profile             |                       Yes |   Yes |
| View visible organization resources   |                       Yes |   Yes |
| Create organization-owned resources   | Configurable; default yes |   Yes |
| Invite or remove members              |                        No |   Yes |
| Change organization roles             |                        No |   Yes |
| Change base resource permission       |                        No |   Yes |
| Administer all organization resources |                        No |   Yes |
| Archive or delete organization        |                        No |   Yes |

Whether members may create organization-owned resources should be an organization setting once there is evidence that it needs to vary. For the first release it can be a fixed `true`, with the creator receiving an explicit `admin` grant so they can manage access without being an organization owner.

### Resource roles

| Capability                        | Viewer | Editor | Admin | Organization owner |
| --------------------------------- | -----: | -----: | ----: | -----------------: |
| Read and search                   |    Yes |    Yes |   Yes |                Yes |
| Connect from accessible knowledge |    Yes |    Yes |   Yes |                Yes |
| Edit content and metadata         |     No |    Yes |   Yes |                Yes |
| Collaborate in real time          |     No |    Yes |   Yes |                Yes |
| Change resource grants            |     No |     No |   Yes |                Yes |
| Transfer or delete resource       |     No |     No |   Yes |                Yes |

`owner` is not a resource grant role. Ownership is a property of the user or organization principal represented by `owns`. This avoids the current overlap where `owner` appears in the share-role type.

### Effective access resolution

The authorization service should resolve a capability, not ask callers to reconstruct graph predicates. A conceptual API is:

```ts
authorize(userId, resourceId, capability): Promise<AuthorizationDecision>
authorizeMany(userId, resourceIds, capability): Promise<Map<string, AuthorizationDecision>>
filterAccessible(userId, resourceType, capability, queryOptions): QueryPredicate
```

The decision should include `allowed`, the effective role, owner principal, and winning access source for UI explanations and audit/debugging.

Evaluate access in this order, taking the highest applicable resource role:

1. The user directly owns the resource: full access.
2. An organization owned by the resource has an active owner membership for the user: full access.
3. The user has a direct `access_grant` to the resource.
4. Future: an active team membership grants access.
5. The user is an active member of the owning organization and its `baseResourceRole` grants access.
6. During migration, a legacy `shared_with` edge grants its mapped role.
7. Existing public visibility rules grant read-only access where applicable.
8. Existing connected/embedded proxy access may grant read-only access, but only if its source resource is accessible through this same resolver.

If the resource is organization-owned, suspended or absent membership must block organization-derived base, team, and member grants. Direct outside-collaborator grants are a separate future policy and must be distinguishable rather than accidentally surviving membership removal.

All authorization failures should be fail-closed. A database error is not equivalent to “not found,” and callers should not turn an indeterminate result into access.

## End-to-end flows

### Create an organization

1. Authenticated user supplies name and slug.
2. Server creates the organization and the creator's active `owner` membership in one transaction.
3. UI switches into the new organization context and opens organization settings.
4. Audit event records creation.

### Invite and join

1. Owner opens **Organization settings -> People** and enters an email and organization role.
2. Server normalizes the email, checks owner authority, upserts the pending invitation, and sends the email after persistence.
3. People view shows pending status, expiry, resend, and revoke controls.
4. Recipient opens the tokenized link.
5. Existing users sign in if necessary; new users register with the invited email prefilled and locked for that flow.
6. Server accepts the invitation transactionally.
7. Recipient enters the organization with access derived from its base permission and explicit grants.

Email delivery failure should leave a retryable invitation record and return delivery status separately. It must not roll back the invitation or report that membership already exists.

### Create organization knowledge

Ownership should normally be inferred from the action's context, not selected in a required field on every create form:

1. Global capture, keyboard shortcuts, and profile-menu creation omit an owner and therefore create personal knowledge.
2. An explicit organization action, such as **New idea for Acme**, supplies the organization owner.
3. A strong owned-container context, such as an entered organization-owned Rabbithole, supplies the container's organization owner.
4. The API validates the resolved owner and the user's create capability, then creates the resource and ownership edge in one transaction.
5. An organization member creator receives an `admin` resource grant; an organization owner does not require one.
6. Search, lists, graph, recent activity, and the resource header display the owner context.

Personal is the safe default. Merely viewing an organization page or choosing an organization in navigation must not silently change the behavior of the global capture button. Organization creation comes from explicit organization buttons or a visibly active owned-container context.

For owned containers, creation and inclusion should be one server operation. The current client creates a personal record and then separately includes it in the entered Rabbithole. That two-step flow can produce the wrong owner or an orphaned resource if inclusion fails. A context-aware create request should send the Rabbithole ID; the server resolves its owner, validates access, creates the resource, and adds the inclusion relation atomically.

### Grant selective access

1. A resource admin opens the access manager.
2. The UI identifies the organization owner, base permission, and people with explicit access.
3. Admin adds an active member as viewer, editor, or admin.
4. The server verifies resource-admin capability, validates active membership, upserts the grant, and writes an audit event.
5. Revocation removes only the explicit grant. The UI explains when base organization access still applies.

### Leave or remove a member

1. Server verifies that the operation will not remove the last owner.
2. Membership is deleted or suspended according to the action.
3. Member-specific grants to organization resources are removed or disabled transactionally; audit history remains.
4. Active WebSocket sessions must reauthorize or disconnect promptly rather than retaining editor access until reconnect.
5. Personal resources and personal shares are unchanged.

### Transfer existing personal knowledge

Explicit transfer is the primary way a globally captured personal resource becomes organization-owned. It should live in an **Ownership** section beside access controls, but remain visually distinct from sharing:

1. The personal owner opens **Access and ownership**.
2. The panel shows **Owned by You** and a **Transfer ownership** action.
3. A modal lists only organizations where the user may create knowledge.
4. The confirmation explains that the organization becomes the owner, organization owners gain administrative control, and existing access may change.
5. The server performs the transfer and returns the user's resulting effective role.
6. The resource header changes to **Owned by Acme** and the former owner normally retains an explicit `admin` grant.

This is a consequential action, not a dropdown that saves immediately. Sharing a personal resource with organization members must not imply transfer, and transferring must not be presented as a reversible share toggle.

The transfer contract requires:

- only the current user owner can initiate transfer;
- the user must be an active member allowed to create organization knowledge;
- all referenced files and dependent records must be checked;
- the `owns` edge changes transactionally;
- the former owner receives an `admin` grant unless they choose otherwise;
- an audit event records both principals;
- transfer back to a user is a distinct operation and policy decision.

For the first idea-only vertical slice, transfer may be implemented with idea dependencies explicitly inventoried. Before files, sources, excerpts, tags, or Rabbitholes can transfer, their dependent records and object-storage ownership must have defined behavior.

## API surface

Use organization slugs in human-facing routes and resolved organization IDs internally.

### Organizations

```text
POST   /api/organizations
GET    /api/organizations
GET    /api/organizations/:slug
PATCH  /api/organizations/:slug
DELETE /api/organizations/:slug              # archive first; hard delete is separate
```

`GET /api/organizations` returns organizations where the current user has active membership, including their organization role.

### Members and invitations

```text
GET    /api/organizations/:slug/members
PATCH  /api/organizations/:slug/members/:userId
DELETE /api/organizations/:slug/members/:userId
POST   /api/organizations/:slug/invitations
GET    /api/organizations/:slug/invitations
POST   /api/organizations/:slug/invitations/:invitationId/resend
DELETE /api/organizations/:slug/invitations/:invitationId
GET    /api/organization-invitations/:token/preview
POST   /api/organization-invitations/:token/accept
```

The preview endpoint returns only the organization name, inviter display name, target email hint, role, and expiry needed by the acceptance UI.

### Resource ownership and access

Creation endpoints should accept a discriminated owner reference rather than an ambient “current organization” header:

```ts
type OwnerRef = { type: "user"; id: string } | { type: "organization"; id: string };

type CreationContext =
  | { type: "organization"; organizationId: string }
  | { type: "rabbithole"; rabbitholeId: string }
  | { type: "connected-resource"; resourceId: string };
```

Omitting both owner and context means personal ownership by the authenticated user. For an explicit organization action, the client may send the organization creation context. For an owned-container action, send the container ID rather than copying its owner from client state; the server resolves the current container owner and validates that the new resource may inherit it. An explicit `owner` remains useful for transfer and internal service contracts, but API handlers must never trust it without authorization.

```text
GET    /api/resources/:resourceId/access
PUT    /api/resources/:resourceId/access/users/:userId
DELETE /api/resources/:resourceId/access/users/:userId
POST   /api/resources/:resourceId/transfer
```

Existing type-specific URLs may remain, but authorization and access mutations must use shared services. Never trust a client-supplied organization ID or owner reference without resolving the user's capability server-side.

Expected status behavior:

- `400`: malformed request or invalid transition;
- `401`: no valid session;
- `403`: authenticated but insufficient capability;
- `404`: resource is absent or intentionally concealed;
- `409`: slug, membership, pending-invitation, or last-owner conflict;
- `410`: invitation is expired or revoked;
- `422`: valid request that violates a domain invariant.

## Frontend information architecture

### Global context

Add an account/organization switcher near the profile navigation. It chooses the workspace being browsed; it is not itself an authorization boundary and does not globally mutate the owner used by capture. The server always derives access from the user and requested resource.

Recommended routes:

```text
/organizations/new
/organizations/:slug
/organizations/:slug/people
/organizations/:slug/settings
/organizations/:slug/knowledge
/invitations/:token
```

Lists, search results, graph nodes, and breadcrumbs should show a compact owner badge when the owner is an organization. Filters should support **Personal**, individual organizations, and **All accessible**.

### Ownership inference and creation surfaces

Treat creation as a hierarchy of increasingly strong context:

| Creation surface                                                            | Inferred owner            | User-facing signal                                                   |
| --------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------- |
| Global `CaptureButton`, keyboard shortcut, or profile menu                  | Current user              | No extra prompt; success says **Created in Personal**                |
| Global capture while merely viewing an organization page                    | Current user              | Organization page does not silently override global capture          |
| **New idea** or quick capture inside an organization page                   | That organization         | Button copy or nearby badge says **for Acme**                        |
| Global or inline creation while an organization-owned Rabbithole is entered | Rabbithole's organization | Persistent banner/chip says **Creating for Acme in Rabbithole name** |
| Creation while a personal Rabbithole is entered                             | Current user              | Existing Rabbithole indicator can say **Personal**                   |
| **Create and connect** from an organization-owned resource                  | Same organization         | Form shows **Owned by Acme** before submit                           |
| **Create and connect** from another user's shared resource                  | Current user              | Never inherit ownership from another user                            |
| Explicit transfer from a resource panel                                     | Selected organization     | Confirmation dialog describes the ownership change                   |

These rules preserve the speed and muscle memory of the current `CaptureButton`: opening it should not add an ownership picker or extra click. If a user wants organization ownership from a neutral screen, they may create personally and transfer, navigate to the organization and use its create action, or use an optional secondary **Create for...** action. The primary quick-capture path stays personal.

The inferred owner must be visible before submit whenever it is not personal. Use one compact ownership treatment consistently:

- an organization avatar and **Acme** label in create forms;
- a persistent organization-colored chip while inside an owned Rabbithole;
- **Owned by Acme** in resource headers and access panels;
- organization badges on list cards, search results, and graph details.

Do not rely on color alone. The label should be visible on desktop and mobile, and assistive text should name the organization.

If the active context implies an organization owner but the user cannot create for that organization, fail before the user enters content where possible. Disable the organization create action with an explanation. While inside an organization-owned Rabbithole, offer **Exit Rabbithole to create personally** rather than silently falling back to personal ownership.

### Organization workspace

The organization home should be a useful scoped workspace, not just settings. Its primary actions are explicit:

- **New idea for Acme**;
- **Quick capture for Acme**;
- **New Rabbithole for Acme** when Rabbitholes become organization-ownable;
- **View constellation** scoped to Acme;
- **Browse knowledge** scoped to Acme;
- **People and access** for organization owners.

The page header carries the organization identity, while the knowledge area shows only organization-owned resources the current user can access. Organization owners may also have a management view that includes every organization resource. Counts shown to ordinary members must reflect accessible resources, not disclose inaccessible resource titles or totals.

### Organization-owned Rabbitholes

Entering a Rabbithole is already a persistent creation mode in the current client, and quick capture automatically includes newly created ideas and tasks. That makes it the clearest ownership-inheritance surface:

1. User enters an organization-owned Rabbithole.
2. The existing entered-Rabbithole indicator expands to show **Acme / Rabbithole name** and **New knowledge will be owned by Acme**.
3. Global and inline creation resolve the Rabbithole on the server, inherit its organization owner, and include the new resource atomically.
4. Exiting returns global creation to personal ownership.

For the first release, an organization-owned Rabbithole should include only resources owned by the same organization. Moving a personal resource into it prompts **Transfer to Acme and include**. This avoids treating containment as an invisible access grant. Later, cross-owner references may be allowed, but inclusion or connection must never change ownership or expand access by itself.

### Ownership and access panel

Evolve the current `AccessManager` into **Access and ownership**, ordered from most fundamental to most specific:

1. **Owner**: **You** or the organization identity.
2. **Your access**: effective role and the path that grants it.
3. **Organization access**: base permission for organization-owned resources.
4. **People with explicit access**: viewer, editor, and admin grants.
5. **Ownership actions**: transfer for eligible personal owners; organization transfer controls only for organization owners under a later policy.

The resource header should expose the owner as a small clickable badge; the panel contains the consequential controls. This makes ownership discoverable without putting a selector into routine capture.

### Filtering and scope

Owner scope and access source are separate concepts:

- **Owned by** answers whose knowledge it is: **You**, **Acme**, **Another organization**.
- **Access** answers why it appears: directly owned, organization membership, or explicitly shared.
- Tags, dates, Rabbitholes, and resource types continue to refine the selected owner/access set.

Recommended workspace defaults:

| Surface                                         | Default scope              | Available alternatives                              |
| ----------------------------------------------- | -------------------------- | --------------------------------------------------- |
| Personal home, existing Ideas/Tasks/Files pages | **Personal**               | Specific organization or **All accessible**         |
| Organization home and knowledge page            | Fixed to that organization | Resource type, tags, dates, Rabbithole, access role |
| Global search/Spotlight                         | **All accessible**         | Personal, organization, explicitly shared           |
| Personal Constellation entry point              | **Personal**               | Organization or **All accessible**                  |
| Organization **View constellation**             | Fixed to that organization | Filters within that organization                    |
| Sharing page                                    | **Explicitly shared**      | Incoming, outgoing, owner                           |

Use URL-addressable owner scope for full pages, for example `?owner=user:me` or `?owner=organization:acme`, so navigation, refresh, and shared internal links behave predictably. A fixed organization page should not allow clearing its owner scope; **All accessible** belongs to global views.

Extend the graph/search filter contract with structured owner principals rather than overloading the current `showShared` boolean or ambiguous `scope` string array:

```ts
type PrincipalRef = { type: "user"; id: string } | { type: "organization"; id: string };

type OwnershipFilter = {
  owners?: PrincipalRef[];
  accessSources?: ("direct-owner" | "organization" | "explicit-share")[];
};
```

Every result returned to owner-aware UI should include a safe owner summary and the current user's effective role/access source. Authorization is applied before filtering and aggregation; owner filters must never reveal the existence or counts of inaccessible records.

On cards and search results, suppress redundant personal labels in a personal-only view. Show owner badges when results mix principals, and always show them on organization-owned resources opened outside their organization workspace. In the Constellation, ownership should be available as a legend/filter and a subtle node treatment, while selection and accessibility must not depend on color.

Connections remain independent of ownership. Users may connect resources only when authorized for both endpoints; creating a connection does not transfer either resource and does not grant access to the other endpoint.

### Organization settings

Provide:

- General: name, slug, description, base resource permission.
- People: owners, members, pending invitations, role changes, suspend/remove, resend/revoke.
- Knowledge: organization-owned resources and their visibility/grant summary.
- Danger zone: leave, archive, and eventually delete.

### Resource access manager

Replace the assumption that the signed-in user is always displayed as “Owner.” This may be the same component as the **Ownership and access panel** described above. Show:

- the owning user or organization;
- the viewer's effective role and why they have it;
- organization base access;
- explicit member grants;
- future team and outside-collaborator sections;
- disabled controls with an explanation when access is inherited and cannot be removed here.

The current share-link control only copies an authenticated route; it is not a public capability link and should not imply that copying the URL grants access.

## Audit and operational requirements

Add an immutable `organization_audit_event` record for at least:

- organization created, updated, archived;
- invitation created, resent, revoked, accepted, expired;
- member joined, role changed, suspended, removed, left;
- resource created for organization, transferred, deleted;
- resource grant created, changed, revoked;
- base resource permission changed.

Store actor, organization, action, target references, timestamp, and minimal structured metadata. Do not store raw invitation tokens or sensitive document contents.

Rate-limit invitation creation, resend, preview, and acceptance. Invitation endpoints must avoid account enumeration. Rotate tokens on resend. Redact token-bearing URLs from application logs and analytics.

Organization deletion should initially be soft archival. A later hard-delete workflow must inventory organization-owned database records, object-storage files, collaboration state, search/embedding artifacts, and audit retention before it can be safely implemented.

## Delivery plan

### Phase 0: centralize authorization

- Introduce capability and role types shared by client and server.
- Make `Authorization` resolve owner principals and effective roles.
- Replace bespoke ownership predicates in API handlers with the resolver.
- Provide bulk/query helpers used by search, graph, recommendations, exports, and lists.
- Preserve current user ownership and `shared_with` behavior through compatibility reads.

Exit criterion: existing personal ownership and sharing behavior passes through the new resolver with no endpoint-specific access rules.

### Phase 1: organization and membership

- Add organization model, membership relation, migrations, service, and API.
- Add organization creation, switcher, profile/settings, people list, and last-owner invariant.
- Add audit events.

Exit criterion: users can create and belong to multiple organizations without changing personal knowledge visibility.

### Phase 2: invitations

- Add durable invitation records, token hashing, expiry, resend/revoke, email, preview, registration handoff, and transactional acceptance.
- Keep referral acquisition separate.

Exit criterion: both existing and new users can accept exactly once; revoked, expired, mismatched, and replayed tokens fail safely.

### Phase 3: one organization-owned vertical slice

- Make ideas organization-ownable.
- Keep global capture personal; add explicit organization creation actions and personal-idea-to-organization transfer through **Access and ownership**.
- Add the context-aware creation contract that later owned containers will use.
- Add organization knowledge lists, base permission, direct grants, access-manager updates, search, graph, and real-time collaboration support.
- Add owner badges and structured owner/access-source filtering to mixed-resource surfaces.
- Reauthorize WebSocket sessions after membership or grant changes.

Exit criterion: an idea created explicitly for an organization or transferred from personal ownership has consistent read, edit, search, graph, and collaborative behavior for owner, granted member, ungranted member, suspended member, and non-member.

### Phase 4: remaining knowledge types and migration

- Audit and add tasks, sources, excerpts, files, tags, and rabbitholes.
- When Rabbitholes become organization-ownable, make context-aware creation and inclusion atomic and apply the ownership-inference UI defined above.
- Update imports, exports, deletion, recommendations, analytics, pins, and activity counts.
- Migrate `shared_with` edges to `access_grant` and remove compatibility reads after verification.

### Phase 5: GitHub-like scaling features

- Teams and team maintainers.
- Team resource grants.
- Outside collaborators.
- Optional delegated organization admin role.
- Optional knowledge-space/container abstraction if individual resource grants become too noisy.
- Enterprise identity, domain policy, SCIM, and SSO only when demanded.

## Test strategy

Follow the repository's confidence-over-coverage policy. Do not put test-only behavior in application code.

Backend integration coverage should prove persisted graph state and API behavior for:

- creating an organization creates exactly one owner membership;
- a user can hold memberships in multiple organizations;
- duplicate membership and pending invitation invariants;
- invitation accept, replay, expiry, revocation, resend rotation, and email mismatch;
- the last owner cannot leave or be removed;
- base permission and explicit-grant precedence;
- a suspended/removed member immediately loses organization-derived access;
- organization owner, resource admin, editor, viewer, and no-access capability matrix;
- organization ownership cannot coexist with user ownership;
- transferring a personal idea replaces its ownership edge and gives the former owner the intended resulting grant;
- personal knowledge remains inaccessible to the organization;
- owner and access-source filters never return or count inaccessible records;
- search and graph bulk filtering return the same authorized set as single-resource checks.

Frontend interaction tests should cover the organization switcher, invite form, pending invitation controls, acceptance states, personal global capture, explicit organization creation, organization-owned Rabbithole inference, transfer confirmation, owner filters, and access-manager explanations. Mock network calls, not child components.

One Playwright flow should cover: owner creates organization -> invites a new email -> invitee registers and accepts -> owner globally captures a personal idea -> owner transfers it to the organization and grants editor -> invitee edits through the collaborative editor -> owner removes invitee -> invitee loses REST and WebSocket access.

## Definition of done for the first release

- No protected code path assumes `owns.in` is always a user.
- Organization owners can create, invite, revoke, resend, change member roles, and remove members.
- Invitees can register or sign in and accept a valid invitation once.
- Organizations directly own ideas through the graph; ownership is not copied onto every member.
- Global capture creates personal ideas without an ownership prompt, while explicit organization actions create organization ideas.
- A personal idea owner can explicitly transfer ownership to an eligible organization through **Access and ownership**.
- Resource admins can selectively grant viewer/editor/admin access to active members.
- Global and organization views can filter by owner without exposing inaccessible resources.
- Effective access is identical across direct APIs, search, graph, files embedded in ideas, and real-time collaboration.
- Personal resources stay private unless explicitly shared.
- Membership and access changes are audited and take effect promptly.
- Typecheck, backend integration tests, frontend interaction tests, and the critical E2E flow pass against dedicated test databases with external email mocked.

## Decisions to confirm before implementation

The proposal recommends defaults so implementation can begin, but these product decisions deserve explicit confirmation:

1. **Default base access:** `none` is safest and matches selective sharing; `viewer` is friendlier for open internal knowledge.
2. **Member creation:** recommended yes, with the creator receiving resource `admin`; alternatively only organization owners create shared knowledge.
3. **First owned resource:** recommended `idea`, because it exercises search, graph, sharing, files, and collaboration end to end.
4. **Membership removal:** recommended delete the active membership edge and retain history in audit records; suspension keeps the edge for reversible offboarding.
5. **Ownership transfer:** include personal idea -> organization in the first idea slice; defer organization -> user and dependency-heavy resource transfers.
6. **Teams:** recommended defer, while retaining `access_grant` as a principal-to-resource relation so teams do not require another authorization rewrite.

## External model references

- [GitHub: roles in an organization](https://docs.github.com/en/organizations/managing-peoples-access-to-your-organization-with-roles/roles-in-an-organization)
- [GitHub: repository roles for an organization](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization)
- [GitHub: inviting users to join an organization](https://docs.github.com/en/organizations/managing-membership-in-your-organization/inviting-users-to-join-your-organization)
- [GitHub: outside collaborators](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-outside-collaborators/adding-outside-collaborators-to-repositories-in-your-organization)
