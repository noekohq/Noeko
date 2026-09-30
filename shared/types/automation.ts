import type { StringRecordId } from "surrealdb";

export const apiScopes = [
  "profile:read",
  "ideas:read",
  "ideas:write",
  "webhooks:read",
  "webhooks:write",
] as const;

export type ApiScope = (typeof apiScopes)[number];
export type ActorType = "interface" | "api_credential" | "import" | "system" | "collaborator";

export type ActorContext = {
  userId: string;
  type: ActorType;
  actorId?: string;
};

export type ApiCredential = {
  id: StringRecordId;
  userId: StringRecordId;
  name: string;
  prefix: string;
  secretHash: string;
  scopes: ApiScope[];
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
  revokedAt?: Date;
};

export type DomainEventType =
  | "idea.created"
  | "idea.updated"
  | "idea.deleted"
  | "idea.processing.completed"
  | "idea.processing.failed"
  | "webhook.test";

export type DomainEvent = {
  id: StringRecordId;
  type: DomainEventType;
  version: number;
  userId: StringRecordId;
  actorType: ActorType;
  actorId?: string;
  resourceType: string;
  resourceId: string;
  data: Record<string, unknown>;
  status: "pending" | "processing" | "dispatched";
  attempt: number;
  createdAt: Date;
  dispatchedAt?: Date;
  leaseOwner?: string;
  leaseExpiresAt?: Date;
};

export type Webhook = {
  id: StringRecordId;
  userId: StringRecordId;
  url: string;
  events: string[];
  encryptedSecret: string;
  enabled: boolean;
  consecutiveFailures: number;
  createdAt: Date;
  updatedAt: Date;
  disabledAt?: Date;
};

export type WebhookDelivery = {
  id: StringRecordId;
  webhookId: StringRecordId;
  eventId: StringRecordId;
  status: "pending" | "delivering" | "succeeded" | "failed";
  attempt: number;
  nextAttemptAt: Date;
  createdAt: Date;
  updatedAt: Date;
  deliveredAt?: Date;
  responseStatus?: number;
  error?: string;
  leaseOwner?: string;
  leaseExpiresAt?: Date;
};
