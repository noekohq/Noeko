import type { Migration } from "./types";

export const migration: Migration = {
  id: "20260804130000_add_organizations",
  description: "Add organizations, memberships, resource grants, and organization audit events.",
  async up(db) {
    await db.query(`
      DEFINE TABLE IF NOT EXISTS organization SCHEMAFULL;
      DEFINE FIELD IF NOT EXISTS name ON TABLE organization TYPE string;
      DEFINE FIELD IF NOT EXISTS slug ON TABLE organization TYPE string;
      DEFINE FIELD IF NOT EXISTS description ON TABLE organization TYPE option<string>;
      DEFINE FIELD IF NOT EXISTS baseResourceRole ON TABLE organization TYPE string DEFAULT 'none';
      DEFINE FIELD IF NOT EXISTS createdBy ON TABLE organization TYPE record<user>;
      DEFINE FIELD IF NOT EXISTS createdAt ON TABLE organization TYPE datetime;
      DEFINE FIELD IF NOT EXISTS updatedAt ON TABLE organization TYPE datetime;
      DEFINE FIELD IF NOT EXISTS archivedAt ON TABLE organization TYPE option<datetime>;
      DEFINE INDEX IF NOT EXISTS organization_slug_idx
        ON TABLE organization COLUMNS slug UNIQUE;

      DEFINE TABLE IF NOT EXISTS member_of TYPE RELATION IN user OUT organization SCHEMAFULL;
      DEFINE FIELD IF NOT EXISTS role ON TABLE member_of TYPE string;
      DEFINE FIELD IF NOT EXISTS status ON TABLE member_of TYPE string;
      DEFINE FIELD IF NOT EXISTS invitedBy ON TABLE member_of TYPE option<record<user>>;
      DEFINE FIELD IF NOT EXISTS createdAt ON TABLE member_of TYPE datetime;
      DEFINE FIELD IF NOT EXISTS updatedAt ON TABLE member_of TYPE datetime;
      DEFINE INDEX IF NOT EXISTS member_of_principal_organization_idx
        ON TABLE member_of COLUMNS in, out UNIQUE;

      DEFINE TABLE IF NOT EXISTS access_grant TYPE RELATION SCHEMAFULL;
      DEFINE FIELD IF NOT EXISTS role ON TABLE access_grant TYPE string;
      DEFINE FIELD IF NOT EXISTS grantedBy ON TABLE access_grant TYPE record<user>;
      DEFINE FIELD IF NOT EXISTS createdAt ON TABLE access_grant TYPE datetime;
      DEFINE FIELD IF NOT EXISTS updatedAt ON TABLE access_grant TYPE datetime;
      DEFINE INDEX IF NOT EXISTS access_grant_principal_resource_idx
        ON TABLE access_grant COLUMNS in, out UNIQUE;

      DEFINE TABLE IF NOT EXISTS organization_audit_event SCHEMAFULL;
      DEFINE FIELD IF NOT EXISTS organization ON TABLE organization_audit_event TYPE record<organization>;
      DEFINE FIELD IF NOT EXISTS actor ON TABLE organization_audit_event TYPE record<user>;
      DEFINE FIELD IF NOT EXISTS action ON TABLE organization_audit_event TYPE string;
      DEFINE FIELD IF NOT EXISTS target ON TABLE organization_audit_event TYPE option<record>;
      DEFINE FIELD IF NOT EXISTS metadata ON TABLE organization_audit_event TYPE option<object>;
      DEFINE FIELD IF NOT EXISTS metadata.* ON TABLE organization_audit_event TYPE any;
      DEFINE FIELD IF NOT EXISTS createdAt ON TABLE organization_audit_event TYPE datetime;
      DEFINE INDEX IF NOT EXISTS organization_audit_event_org_created_idx
        ON TABLE organization_audit_event COLUMNS organization, createdAt;
    `);
  },
  async down(db) {
    await db.query(`
      REMOVE TABLE organization_audit_event;
      REMOVE TABLE access_grant;
      REMOVE TABLE member_of;
      REMOVE TABLE organization;
    `);
  },
};
