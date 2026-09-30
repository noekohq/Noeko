import type { Migration } from "./types";

export const migration: Migration = {
  id: "20260805130000_add_organization_invitations",
  description: "Add durable, expiring organization invitations.",
  async up(db) {
    await db.query(`
      DEFINE TABLE IF NOT EXISTS organization_invitation SCHEMAFULL;
      DEFINE FIELD IF NOT EXISTS organization ON TABLE organization_invitation TYPE record<organization>;
      DEFINE FIELD IF NOT EXISTS email ON TABLE organization_invitation TYPE string;
      DEFINE FIELD IF NOT EXISTS role ON TABLE organization_invitation TYPE string;
      DEFINE FIELD IF NOT EXISTS status ON TABLE organization_invitation TYPE string;
      DEFINE FIELD IF NOT EXISTS tokenHash ON TABLE organization_invitation TYPE string;
      DEFINE FIELD IF NOT EXISTS invitedBy ON TABLE organization_invitation TYPE record<user>;
      DEFINE FIELD IF NOT EXISTS acceptedBy ON TABLE organization_invitation TYPE option<record<user>>;
      DEFINE FIELD IF NOT EXISTS createdAt ON TABLE organization_invitation TYPE datetime;
      DEFINE FIELD IF NOT EXISTS updatedAt ON TABLE organization_invitation TYPE datetime;
      DEFINE FIELD IF NOT EXISTS expiresAt ON TABLE organization_invitation TYPE datetime;
      DEFINE FIELD IF NOT EXISTS acceptedAt ON TABLE organization_invitation TYPE option<datetime>;
      DEFINE FIELD IF NOT EXISTS revokedAt ON TABLE organization_invitation TYPE option<datetime>;
      DEFINE INDEX IF NOT EXISTS organization_invitation_token_hash_idx
        ON TABLE organization_invitation COLUMNS tokenHash UNIQUE;
      DEFINE INDEX IF NOT EXISTS organization_invitation_org_email_idx
        ON TABLE organization_invitation COLUMNS organization, email;
    `);
  },
  async down(db) {
    await db.query(`REMOVE TABLE organization_invitation;`);
  },
};
