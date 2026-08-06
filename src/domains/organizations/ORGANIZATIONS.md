# Organizations

Organizations let a group own and govern shared knowledge without absorbing or exposing anyone’s personal knowledge graph. A user can belong to many organizations, and every resource continues to have exactly one owner: either a user or an organization.

## User jobs

- Create an organization and become its first owner.
- Invite someone by email, whether or not they already have a Noeko account.
- Join from a single-use invitation after signing in or creating an account.
- Create knowledge directly for an organization when the surrounding context makes ownership clear.
- Create personal knowledge by default and explicitly transfer it to an organization later.
- Understand who owns a resource and which organization knowledge is visible to them.
- As an owner, promote, demote, suspend, reactivate, or remove members without ever leaving the organization ownerless.

## Vocabulary and boundaries

- **Owner** is an organization role. Owners administer membership and have administrative access to organization-owned resources.
- **Member** is an organization role. Membership alone does not imply access to every organization resource.
- **Resource role** (`viewer`, `editor`, or `admin`) is separate from the organization role.
- **Invitation** is a durable, expiring, revocable record for one normalized email address. It is not a referral link.
- **Personal ownership** remains the default for global capture. Organization ownership is inferred only from an explicit organization creation surface or an organization-owned context.

An invitation token is single-use, expires after seven days, and is stored only as a SHA-256 hash. Acceptance requires the authenticated account email to match the invitation email exactly after normalization. Resending rotates both the token and expiry.

## Core invariants

1. Personal knowledge is never moved or shared merely because its owner joins an organization.
2. Every organization has at least one active owner. The final active owner cannot leave, be removed, be suspended, or be demoted.
3. Removing or suspending membership immediately removes membership-derived access.
4. Ownership transfer is explicit and audited.
5. Organization role and per-resource access remain separate concepts.
6. Protected reads and writes must resolve through the same authorization rules, including collaborative editing.

## Information architecture

The organization index lists a user’s memberships and creates organizations. An organization page is the home for its visible knowledge and People controls. Resource creation from that page assigns organization ownership immediately. Global capture remains personal. The invitation landing page is public enough to explain the invitation, then routes existing users through sign-in and new users through registration.

The canonical graph model, permission matrix, and deeper design rationale live in [`documentation/growing_zones/ORGANIZATIONS.md`](../../../documentation/growing_zones/ORGANIZATIONS.md).
