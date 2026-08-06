import type { RecordId } from "surrealdb";
import type { IPublicUser } from "./user";

export type IOrganizationRole = "owner" | "member";
export type IOrganizationMembershipStatus = "active" | "suspended";
export type IOrganizationBaseResourceRole = "none" | "viewer" | "editor";
export type IResourceAccessRole = "viewer" | "editor" | "admin";
export type IOrganizationInvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export type IOrganization = {
  id: string | RecordId;
  name: string;
  slug: string;
  description?: string;
  baseResourceRole: IOrganizationBaseResourceRole;
  createdBy: string | RecordId;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
};

export type IOrganizationMembership = {
  id: string | RecordId;
  in: string | RecordId;
  out: string | RecordId;
  role: IOrganizationRole;
  status: IOrganizationMembershipStatus;
  invitedBy?: string | RecordId;
  createdAt: Date;
  updatedAt: Date;
};

export type IOrganizationSummary = IOrganization & {
  membership: Pick<IOrganizationMembership, "role" | "status">;
};

export type IOrganizationMember = Pick<
  IOrganizationMembership,
  "id" | "role" | "status" | "createdAt" | "updatedAt"
> & {
  user: IPublicUser & { email?: string };
};

export type IOrganizationForm = {
  name: string;
  slug: string;
  description?: string;
};

export type IOrganizationInvitation = {
  id: string | RecordId;
  organization: string | RecordId;
  email: string;
  role: IOrganizationRole;
  status: IOrganizationInvitationStatus;
  invitedBy: string | RecordId;
  acceptedBy?: string | RecordId;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
  revokedAt?: Date;
};

export type IOrganizationInvitationSummary = IOrganizationInvitation & {
  inviter: Pick<IPublicUser, "id" | "firstName" | "lastName">;
};

export type IOrganizationInvitationPreview = {
  email: string;
  role: IOrganizationRole;
  expiresAt: Date;
  organization: Pick<IOrganization, "id" | "name" | "slug" | "description">;
  inviter: Pick<IPublicUser, "firstName" | "lastName">;
};

export type IOwnerSummary =
  | {
      type: "user";
      id: string | RecordId;
      name: string;
    }
  | {
      type: "organization";
      id: string | RecordId;
      name: string;
      slug: string;
    };
