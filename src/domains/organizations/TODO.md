# Organizations delivery

## Verified current slice

- Organization records and many-to-many `member_of` graph relationships.
- Organization creation with the creator as its first active owner.
- Organization index and organization detail pages.
- Personal capture by default, explicit idea ownership transfer, and direct organization idea creation.
- Organization-aware ownership display and authorization for owners, members, and direct grants.
- Durable email invitations with hashed single-use tokens, seven-day expiry, resend rotation, revocation, and audit events.
- Public invitation preview, existing-account acceptance after sign-in, and invitation-backed registration.
- People controls for role, status, removal, invitation resend/revoke, and leaving.
- Last-active-owner safeguards across demotion, suspension, removal, and leaving.

## Near term

- Add focused backend integration and frontend interaction regression tests once test-file changes are authorized.
- Add per-resource grant APIs and Access Manager controls for organization members.
- Add organization ownership filters to global knowledge, search, and constellation surfaces.
- Surface delivery failures and invitation history more explicitly to owners.
- Decide whether accepted/revoked invitation history should remain visible indefinitely.

## Later

- Organization-owned Rabbitholes and ownership inference while capturing inside one.
- Teams and team-based resource grants.
- Outside collaborators who are not organization members.
- Configurable organization base resource permission and member-create policy.
- Email verification before higher-trust external deployments.

## Open product decisions

- Whether members should see the full member directory or only owners and collaborators on resources they can access.
- Whether owners may transfer organization ownership of a resource back to a user, and what explicit confirmation that requires.
- Whether invitations may nominate an owner or must always create a member who is promoted later.
