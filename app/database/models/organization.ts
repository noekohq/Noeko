import { createHash, randomBytes, randomUUID } from "node:crypto";
import { RecordId, StringRecordId } from "surrealdb";
import type {
  IOwnerSummary,
  IOrganization,
  IOrganizationForm,
  IOrganizationInvitation,
  IOrganizationInvitationPreview,
  IOrganizationInvitationSummary,
  IOrganizationMember,
  IOrganizationMembership,
  IOrganizationSummary,
} from "../../../shared/types/organization";
import type { ISafeIdea } from "../../../shared/types/idea";
import { getDatabase } from "../db";
import { Idea } from "./ideas";
import Authorization from "../../services/Authorization";
import { User } from "./user";
import { organizationInvitationTemplate } from "../../emails/types";
import { sendEmail } from "../../utils/email";

const organizationSlugPattern = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/;
const invitationLifetimeMs = 7 * 24 * 60 * 60 * 1000;

type InvitationDetails = IOrganizationInvitation & {
  organizationRecord: IOrganization;
  inviter: { id: RecordId; firstName: string; lastName: string };
};

export class Organization {
  static normalizeEmail(value: string) {
    return value.trim().toLowerCase();
  }

  static hashInvitationToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  static createInvitationToken() {
    return randomBytes(32).toString("base64url");
  }

  static normalizeSlug(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, "-");
  }

  static isValidSlug(value: string) {
    return organizationSlugPattern.test(value);
  }

  static async get(id: string | RecordId | StringRecordId): Promise<IOrganization | undefined> {
    const db = await getDatabase();
    if (!db) throw new Error("Database not available");
    return db.select<IOrganization>(new StringRecordId(id));
  }

  static async getBySlug(slug: string): Promise<IOrganization | undefined> {
    const db = await getDatabase();
    if (!db) throw new Error("Database not available");
    const [organizations] = await db.query<[IOrganization[]]>(
      `SELECT * FROM organization WHERE slug = $slug AND archivedAt = NONE LIMIT 1;`,
      { slug: Organization.normalizeSlug(slug) }
    );
    return organizations?.[0];
  }

  static async create(userId: string | RecordId, form: IOrganizationForm) {
    const db = await getDatabase();
    if (!db) throw new Error("Database not available");

    const slug = Organization.normalizeSlug(form.slug);
    if (!Organization.isValidSlug(slug)) {
      throw new Error("INVALID_ORGANIZATION_SLUG");
    }
    if (await Organization.getBySlug(slug)) {
      throw new Error("ORGANIZATION_SLUG_TAKEN");
    }

    const organizationId = new StringRecordId(`organization:${randomUUID()}`);
    const creatorId = new StringRecordId(userId);
    const now = new Date();

    await db.query(
      `
        BEGIN TRANSACTION;
        CREATE $organizationId CONTENT {
          name: $name,
          slug: $slug,
          description: $description,
          baseResourceRole: 'none',
          createdBy: $creatorId,
          createdAt: $now,
          updatedAt: $now
        };
        RELATE $creatorId->member_of->$organizationId CONTENT {
          role: 'owner',
          status: 'active',
          createdAt: $now,
          updatedAt: $now
        };
        CREATE organization_audit_event CONTENT {
          organization: $organizationId,
          actor: $creatorId,
          action: 'organization.created',
          target: $organizationId,
          createdAt: $now
        };
        COMMIT TRANSACTION;
      `,
      {
        organizationId,
        creatorId,
        name: form.name.trim(),
        slug,
        description: form.description?.trim() || undefined,
        now,
      }
    );

    return Organization.get(organizationId);
  }

  static async getMembership(
    userId: string | RecordId,
    organizationId: string | RecordId
  ): Promise<IOrganizationMembership | undefined> {
    const db = await getDatabase();
    if (!db) throw new Error("Database not available");
    const [memberships] = await db.query<[IOrganizationMembership[]]>(
      `SELECT * FROM member_of WHERE in = $userId AND out = $organizationId LIMIT 1;`,
      {
        userId: new StringRecordId(userId),
        organizationId: new StringRecordId(organizationId),
      }
    );
    return memberships?.[0];
  }

  static async listForUser(userId: string | RecordId): Promise<IOrganizationSummary[]> {
    const db = await getDatabase();
    if (!db) throw new Error("Database not available");
    const [memberships] = await db.query<[IOrganizationMembership[]]>(
      `SELECT * FROM member_of WHERE in = $userId AND status = 'active' ORDER BY createdAt ASC;`,
      { userId: new StringRecordId(userId) }
    );

    const summaries = await Promise.all(
      (memberships || []).map(async (membership) => {
        const organization = await Organization.get(membership.out);
        if (!organization || organization.archivedAt) return undefined;
        return {
          ...organization,
          membership: {
            role: membership.role,
            status: membership.status,
          },
        } satisfies IOrganizationSummary;
      })
    );

    return summaries.filter((summary): summary is IOrganizationSummary => !!summary);
  }

  static async getMembers(organizationId: string | RecordId): Promise<IOrganizationMember[]> {
    const db = await getDatabase();
    if (!db) throw new Error("Database not available");
    const [members] = await db.query<[IOrganizationMember[]]>(
      `
        SELECT
          id,
          role,
          status,
          createdAt,
          updatedAt,
          in.{ id, firstName, lastName, createdAt } AS user
        FROM member_of
        WHERE out = $organizationId
        ORDER BY createdAt ASC;
      `,
      { organizationId: new StringRecordId(organizationId) }
    );
    return members || [];
  }

  static async requireOwner(userId: string | RecordId, organizationId: string | RecordId) {
    const membership = await Organization.getMembership(userId, organizationId);
    if (!membership || membership.status !== "active" || membership.role !== "owner") {
      throw new Error("ORGANIZATION_OWNER_REQUIRED");
    }
    return membership;
  }

  static async countActiveOwners(organizationId: string | RecordId) {
    const db = await getDatabase();
    if (!db) throw new Error("Database not available");
    const [rows] = await db.query<[{ count: number }[]]>(
      `SELECT count() AS count FROM member_of WHERE out = $organizationId AND role = 'owner' AND status = 'active' GROUP ALL;`,
      { organizationId: new StringRecordId(organizationId) }
    );
    return rows?.[0]?.count ?? 0;
  }

  static async sendInvitationEmail(
    organization: IOrganization,
    inviterId: string | RecordId,
    email: string,
    token: string,
    expiresAt: Date
  ) {
    const inviter = await User.get(inviterId);
    if (!inviter) throw new Error("INVITER_NOT_FOUND");
    const inviterName = `${inviter.firstName} ${inviter.lastName}`.trim();
    const { subject, html } = await organizationInvitationTemplate({
      organizationName: organization.name,
      inviterName,
      token,
      expiresAt,
    });
    return sendEmail(email, subject, html, { from: "team" });
  }

  static async listInvitations(
    organizationId: string | RecordId,
    actorId: string | RecordId
  ): Promise<IOrganizationInvitationSummary[]> {
    await Organization.requireOwner(actorId, organizationId);
    const db = await getDatabase();
    if (!db) throw new Error("Database not available");
    const now = new Date();
    await db.query(
      `UPDATE organization_invitation SET status = 'expired', updatedAt = $now WHERE organization = $organizationId AND status = 'pending' AND expiresAt <= $now;`,
      { organizationId: new StringRecordId(organizationId), now }
    );
    const [invitations] = await db.query<[IOrganizationInvitationSummary[]]>(
      `
        SELECT
          id, organization, email, role, status, invitedBy, acceptedBy,
          createdAt, updatedAt, expiresAt, acceptedAt, revokedAt,
          invitedBy.{ id, firstName, lastName } AS inviter
        FROM organization_invitation
        WHERE organization = $organizationId
        ORDER BY createdAt DESC;
      `,
      { organizationId: new StringRecordId(organizationId) }
    );
    return invitations || [];
  }

  static async createInvitation(
    organizationId: string | RecordId,
    actorId: string | RecordId,
    emailValue: string
  ) {
    await Organization.requireOwner(actorId, organizationId);
    const organization = await Organization.get(organizationId);
    if (!organization || organization.archivedAt) throw new Error("ORGANIZATION_NOT_FOUND");
    const email = Organization.normalizeEmail(emailValue);
    const db = await getDatabase();
    if (!db) throw new Error("Database not available");
    const currentTime = new Date();
    await db.query(
      `UPDATE organization_invitation SET status = 'expired', updatedAt = $now WHERE organization = $organizationId AND email = $email AND status = 'pending' AND expiresAt <= $now;`,
      { organizationId: new StringRecordId(organizationId), email, now: currentTime }
    );
    const [existingUsers] = await db.query<[{ id: RecordId }[]]>(
      `SELECT id FROM user WHERE string::lowercase(email) = $email LIMIT 1;`,
      { email }
    );
    if (existingUsers?.[0]) {
      const membership = await Organization.getMembership(existingUsers[0].id, organizationId);
      if (membership) throw new Error("ORGANIZATION_ALREADY_MEMBER");
    }

    const [pending] = await db.query<[IOrganizationInvitation[]]>(
      `SELECT * FROM organization_invitation WHERE organization = $organizationId AND email = $email AND status = 'pending' AND expiresAt > $now LIMIT 1;`,
      { organizationId: new StringRecordId(organizationId), email, now: currentTime }
    );
    if (pending?.[0]) throw new Error("ORGANIZATION_INVITATION_EXISTS");

    const token = Organization.createInvitationToken();
    const invitationId = new StringRecordId(`organization_invitation:${randomUUID()}`);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + invitationLifetimeMs);
    const organizationRecordId = new StringRecordId(organizationId);
    const actorRecordId = new StringRecordId(actorId);
    await db.query(
      `
        BEGIN TRANSACTION;
        CREATE $invitationId CONTENT {
          organization: $organizationId, email: $email, role: 'member', status: 'pending',
          tokenHash: $tokenHash, invitedBy: $actorId,
          createdAt: $now, updatedAt: $now, expiresAt: $expiresAt
        };
        CREATE organization_audit_event CONTENT {
          organization: $organizationId, actor: $actorId, action: 'invitation.created',
          target: $invitationId, metadata: { email: $email }, createdAt: $now
        };
        COMMIT TRANSACTION;
      `,
      {
        invitationId,
        organizationId: organizationRecordId,
        actorId: actorRecordId,
        email,
        tokenHash: Organization.hashInvitationToken(token),
        now,
        expiresAt,
      }
    );
    const emailSent = await Organization.sendInvitationEmail(
      organization,
      actorId,
      email,
      token,
      expiresAt
    );
    return { invitation: await db.select<IOrganizationInvitation>(invitationId), emailSent };
  }

  static async getInvitationDetails(token: string): Promise<InvitationDetails | undefined> {
    const db = await getDatabase();
    if (!db) throw new Error("Database not available");
    const [invitations] = await db.query<[InvitationDetails[]]>(
      `
        SELECT *, organization.* AS organizationRecord,
          invitedBy.{ id, firstName, lastName } AS inviter
        FROM organization_invitation
        WHERE tokenHash = $tokenHash LIMIT 1;
      `,
      { tokenHash: Organization.hashInvitationToken(token) }
    );
    return invitations?.[0];
  }

  static async previewInvitation(token: string): Promise<IOrganizationInvitationPreview> {
    const invitation = await Organization.getInvitationDetails(token);
    if (!invitation || invitation.status !== "pending") throw new Error("INVITATION_INVALID");
    if (new Date(invitation.expiresAt).getTime() <= Date.now())
      throw new Error("INVITATION_EXPIRED");
    return {
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      organization: {
        id: invitation.organizationRecord.id,
        name: invitation.organizationRecord.name,
        slug: invitation.organizationRecord.slug,
        description: invitation.organizationRecord.description,
      },
      inviter: invitation.inviter,
    };
  }

  static async acceptInvitation(token: string, userId: string | RecordId) {
    const invitation = await Organization.getInvitationDetails(token);
    if (!invitation || invitation.status !== "pending") throw new Error("INVITATION_INVALID");
    if (new Date(invitation.expiresAt).getTime() <= Date.now())
      throw new Error("INVITATION_EXPIRED");
    const user = await User.get(userId);
    if (!user || Organization.normalizeEmail(user.email) !== invitation.email) {
      throw new Error("INVITATION_EMAIL_MISMATCH");
    }
    const existing = await Organization.getMembership(userId, invitation.organization);
    if (existing) throw new Error("ORGANIZATION_ALREADY_MEMBER");

    const db = await getDatabase();
    if (!db) throw new Error("Database not available");
    const now = new Date();
    const userRecordId = new StringRecordId(userId);
    await db.query(
      `
        BEGIN TRANSACTION;
        RELATE $userId->member_of->$organizationId CONTENT {
          role: $role, status: 'active', invitedBy: $invitedBy,
          createdAt: $now, updatedAt: $now
        };
        UPDATE $invitationId SET status = 'accepted', acceptedBy = $userId,
          acceptedAt = $now, updatedAt = $now;
        CREATE organization_audit_event CONTENT {
          organization: $organizationId, actor: $userId, action: 'invitation.accepted',
          target: $invitationId, metadata: { email: $email }, createdAt: $now
        };
        COMMIT TRANSACTION;
      `,
      {
        userId: userRecordId,
        organizationId: new StringRecordId(invitation.organization),
        invitationId: new StringRecordId(invitation.id),
        role: invitation.role,
        invitedBy: new StringRecordId(invitation.invitedBy),
        email: invitation.email,
        now,
      }
    );
    return Organization.get(invitation.organization);
  }

  static async resendInvitation(
    organizationId: string | RecordId,
    actorId: string | RecordId,
    invitationId: string | RecordId
  ) {
    await Organization.requireOwner(actorId, organizationId);
    const organization = await Organization.get(organizationId);
    if (!organization || organization.archivedAt) throw new Error("ORGANIZATION_NOT_FOUND");
    const db = await getDatabase();
    if (!db) throw new Error("Database not available");
    const invitation = await db.select<IOrganizationInvitation>(new StringRecordId(invitationId));
    if (!invitation || invitation.organization.toString() !== organization.id.toString()) {
      throw new Error("INVITATION_INVALID");
    }
    if (!(["pending", "expired"] as const).includes(invitation.status as "pending" | "expired")) {
      throw new Error("INVITATION_NOT_RESENDABLE");
    }

    const token = Organization.createInvitationToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + invitationLifetimeMs);
    await db.query(
      `
        BEGIN TRANSACTION;
        UPDATE $invitationId SET status = 'pending', tokenHash = $tokenHash,
          expiresAt = $expiresAt, updatedAt = $now, revokedAt = NONE;
        CREATE organization_audit_event CONTENT {
          organization: $organizationId, actor: $actorId, action: 'invitation.resent',
          target: $invitationId, metadata: { email: $email }, createdAt: $now
        };
        COMMIT TRANSACTION;
      `,
      {
        invitationId: new StringRecordId(invitation.id),
        organizationId: new StringRecordId(organizationId),
        actorId: new StringRecordId(actorId),
        tokenHash: Organization.hashInvitationToken(token),
        email: invitation.email,
        now,
        expiresAt,
      }
    );
    const emailSent = await Organization.sendInvitationEmail(
      organization,
      actorId,
      invitation.email,
      token,
      expiresAt
    );
    return { invitation: await db.select<IOrganizationInvitation>(invitation.id), emailSent };
  }

  static async revokeInvitation(
    organizationId: string | RecordId,
    actorId: string | RecordId,
    invitationId: string | RecordId
  ) {
    await Organization.requireOwner(actorId, organizationId);
    const db = await getDatabase();
    if (!db) throw new Error("Database not available");
    const invitation = await db.select<IOrganizationInvitation>(new StringRecordId(invitationId));
    if (
      !invitation ||
      invitation.organization.toString() !== new StringRecordId(organizationId).toString()
    ) {
      throw new Error("INVITATION_INVALID");
    }
    if (invitation.status !== "pending" && invitation.status !== "expired") {
      throw new Error("INVITATION_NOT_REVOCABLE");
    }
    const now = new Date();
    await db.query(
      `
        BEGIN TRANSACTION;
        UPDATE $invitationId SET status = 'revoked', revokedAt = $now, updatedAt = $now;
        CREATE organization_audit_event CONTENT {
          organization: $organizationId, actor: $actorId, action: 'invitation.revoked',
          target: $invitationId, metadata: { email: $email }, createdAt: $now
        };
        COMMIT TRANSACTION;
      `,
      {
        invitationId: new StringRecordId(invitation.id),
        organizationId: new StringRecordId(organizationId),
        actorId: new StringRecordId(actorId),
        email: invitation.email,
        now,
      }
    );
  }

  static async updateMember(
    organizationId: string | RecordId,
    actorId: string | RecordId,
    targetUserId: string | RecordId,
    changes: { role?: IOrganizationMembership["role"]; status?: IOrganizationMembership["status"] }
  ) {
    await Organization.requireOwner(actorId, organizationId);
    const membership = await Organization.getMembership(targetUserId, organizationId);
    if (!membership) throw new Error("ORGANIZATION_MEMBER_NOT_FOUND");
    const role = changes.role ?? membership.role;
    const status = changes.status ?? membership.status;
    if (!(["owner", "member"] as const).includes(role)) throw new Error("INVALID_MEMBER_ROLE");
    if (!(["active", "suspended"] as const).includes(status)) {
      throw new Error("INVALID_MEMBER_STATUS");
    }
    const removesActiveOwner =
      membership.role === "owner" &&
      membership.status === "active" &&
      (role !== "owner" || status !== "active");
    if (removesActiveOwner && (await Organization.countActiveOwners(organizationId)) <= 1) {
      throw new Error("LAST_ORGANIZATION_OWNER");
    }

    const db = await getDatabase();
    if (!db) throw new Error("Database not available");
    const now = new Date();
    await db.query(
      `
        BEGIN TRANSACTION;
        UPDATE $membershipId SET role = $role, status = $status, updatedAt = $now;
        CREATE organization_audit_event CONTENT {
          organization: $organizationId, actor: $actorId, action: 'member.updated',
          target: $targetUserId, metadata: { role: $role, status: $status }, createdAt: $now
        };
        COMMIT TRANSACTION;
      `,
      {
        membershipId: new StringRecordId(membership.id),
        organizationId: new StringRecordId(organizationId),
        actorId: new StringRecordId(actorId),
        targetUserId: new StringRecordId(targetUserId),
        role,
        status,
        now,
      }
    );
    return Organization.getMembership(targetUserId, organizationId);
  }

  static async removeMember(
    organizationId: string | RecordId,
    actorId: string | RecordId,
    targetUserId: string | RecordId
  ) {
    await Organization.requireOwner(actorId, organizationId);
    return Organization.deleteMembership(organizationId, actorId, targetUserId, "member.removed");
  }

  static async leave(organizationId: string | RecordId, userId: string | RecordId) {
    const membership = await Organization.getMembership(userId, organizationId);
    if (!membership || membership.status !== "active") {
      throw new Error("ORGANIZATION_MEMBERSHIP_REQUIRED");
    }
    return Organization.deleteMembership(organizationId, userId, userId, "member.left");
  }

  private static async deleteMembership(
    organizationId: string | RecordId,
    actorId: string | RecordId,
    targetUserId: string | RecordId,
    action: "member.removed" | "member.left"
  ) {
    const membership = await Organization.getMembership(targetUserId, organizationId);
    if (!membership) throw new Error("ORGANIZATION_MEMBER_NOT_FOUND");
    if (
      membership.role === "owner" &&
      membership.status === "active" &&
      (await Organization.countActiveOwners(organizationId)) <= 1
    ) {
      throw new Error("LAST_ORGANIZATION_OWNER");
    }
    const db = await getDatabase();
    if (!db) throw new Error("Database not available");
    const now = new Date();
    await db.query(
      `
        BEGIN TRANSACTION;
        DELETE $membershipId;
        CREATE organization_audit_event CONTENT {
          organization: $organizationId, actor: $actorId, action: $action,
          target: $targetUserId, createdAt: $now
        };
        COMMIT TRANSACTION;
      `,
      {
        membershipId: new StringRecordId(membership.id),
        organizationId: new StringRecordId(organizationId),
        actorId: new StringRecordId(actorId),
        targetUserId: new StringRecordId(targetUserId),
        action,
        now,
      }
    );
  }

  static async createIdea(
    organizationId: string | RecordId,
    userId: string | RecordId,
    form: { title: string; content: string }
  ) {
    const membership = await Organization.getMembership(userId, organizationId);
    if (!membership || membership.status !== "active") {
      throw new Error("ORGANIZATION_MEMBERSHIP_REQUIRED");
    }

    const idea = await Idea.create(
      {
        ...form,
        embeddings: null,
        visibility: "private",
      },
      userId,
      { ownerId: organizationId }
    );
    if (!idea) return undefined;

    const db = await getDatabase();
    if (!db) throw new Error("Database not available");
    const now = new Date();
    const grantStatement =
      membership.role === "owner"
        ? ""
        : `RELATE $userId->access_grant->$ideaId CONTENT {
            role: 'admin', grantedBy: $userId, createdAt: $now, updatedAt: $now
          };`;

    await db.query(
      `
        BEGIN TRANSACTION;
        ${grantStatement}
        CREATE organization_audit_event CONTENT {
          organization: $organizationId,
          actor: $userId,
          action: 'resource.created',
          target: $ideaId,
          metadata: { resourceType: 'idea' },
          createdAt: $now
        };
        COMMIT TRANSACTION;
      `,
      {
        organizationId: new StringRecordId(organizationId),
        userId: new StringRecordId(userId),
        ideaId: new StringRecordId(idea.id),
        now,
      }
    );
    return idea;
  }

  static async getIdeas(
    organizationId: string | RecordId,
    userId: string | RecordId
  ): Promise<ISafeIdea[]> {
    const membership = await Organization.getMembership(userId, organizationId);
    if (!membership || membership.status !== "active") {
      throw new Error("ORGANIZATION_MEMBERSHIP_REQUIRED");
    }

    const organization = await Organization.get(organizationId);
    if (!organization) return [];
    const canSeeAll = membership.role === "owner" || organization.baseResourceRole !== "none";
    const db = await getDatabase();
    if (!db) throw new Error("Database not available");
    const accessClause = canSeeAll ? "" : "AND (<-access_grant.in CONTAINS $userId)";
    const [ideas] = await db.query<[ISafeIdea[]]>(
      `
        SELECT * OMIT embeddings
        FROM idea
        WHERE (<-owns.in CONTAINS $organizationId) ${accessClause}
        ORDER BY updatedAt DESC;
      `,
      {
        organizationId: new StringRecordId(organizationId),
        userId: new StringRecordId(userId),
      }
    );
    return ideas || [];
  }

  static async transferIdea(
    organizationId: string | RecordId,
    userId: string | RecordId,
    ideaId: string | RecordId
  ) {
    const membership = await Organization.getMembership(userId, organizationId);
    if (!membership || membership.status !== "active") {
      throw new Error("ORGANIZATION_MEMBERSHIP_REQUIRED");
    }
    if (!(await Authorization.checkOwns(userId, ideaId))) {
      throw new Error("PERSONAL_OWNERSHIP_REQUIRED");
    }

    const db = await getDatabase();
    if (!db) throw new Error("Database not available");
    const ownerId = new StringRecordId(userId);
    const targetOrganizationId = new StringRecordId(organizationId);
    const resourceId = new StringRecordId(ideaId);
    const now = new Date();
    const grantStatement =
      membership.role === "owner"
        ? ""
        : `RELATE $ownerId->access_grant->$resourceId CONTENT {
            role: 'admin', grantedBy: $ownerId, createdAt: $now, updatedAt: $now
          };`;

    await db.query(
      `
        BEGIN TRANSACTION;
        DELETE owns WHERE out = $resourceId;
        RELATE $targetOrganizationId->owns->$resourceId CONTENT { createdAt: $now };
        ${grantStatement}
        CREATE organization_audit_event CONTENT {
          organization: $targetOrganizationId,
          actor: $ownerId,
          action: 'resource.transferred',
          target: $resourceId,
          metadata: { resourceType: 'idea', previousOwner: $ownerId },
          createdAt: $now
        };
        COMMIT TRANSACTION;
      `,
      { ownerId, targetOrganizationId, resourceId, now }
    );

    return Idea.get(ideaId);
  }

  static async getResourceOwner(resourceId: string | RecordId): Promise<IOwnerSummary | undefined> {
    const db = await getDatabase();
    if (!db) throw new Error("Database not available");
    const [owners] = await db.query<[RecordId[]]>(
      `SELECT VALUE in FROM owns WHERE out = $resourceId LIMIT 1;`,
      { resourceId: new StringRecordId(resourceId) }
    );
    const ownerId = owners?.[0];
    if (!ownerId) return undefined;

    if (ownerId.toString().startsWith("organization:")) {
      const organization = await Organization.get(ownerId);
      if (!organization) return undefined;
      return {
        type: "organization",
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      };
    }

    const [users] = await db.query<[{ id: RecordId; firstName: string; lastName: string }[]]>(
      `SELECT id, firstName, lastName FROM user WHERE id = $ownerId LIMIT 1;`,
      { ownerId }
    );
    const user = users?.[0];
    if (!user) return undefined;
    return {
      type: "user",
      id: user.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
    };
  }
}
