# Growing Zones

This serves as a centralized location of migrations, refactors, or ongoing projects within the codebase. Some refactors happen in one big merge, but many refactors are set up to be built piece-by-piece, and as such we seek to document them here in this directory. This isn't a list of Todo's, but rather a set of broad guidelines that updates can follow to keep complexity growth manageable and aligned in the same general direction.

# Frontend

- Ongoing Migration from Legacy `useFetch` hook to `tanstack-query` [documentation](./TANSTACK-QUERY.md)
- Internationalization of the UI with `lingui` macro-based i18n [documentation](./INTERNATIONALIZATION.md)

# Backend

- Potential migration of the backend to Elysia [documentation](./ELYSIA-MIGRATION.md)
- Organization membership, invitations, and shared knowledge [documentation](./ORGANIZATIONS.md)
- Database migration system and authoring guide [documentation](../guides/DATABASE_MIGRATIONS.md)
- Embedding provider architecture and changeover runbook [documentation](../guides/EMBEDDING_PROVIDERS.md)
