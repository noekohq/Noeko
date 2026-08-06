export const INTERACTION_PAYLOAD_VERSION = 1 as const;

export const KNOWLEDGE_REF_TYPES = [
  "idea",
  "source",
  "task",
  "excerpt",
  "tag",
  "rabbithole",
] as const;

export type KnowledgeRefType = (typeof KNOWLEDGE_REF_TYPES)[number];

export const CONNECTABLE_REF_TYPES = ["idea", "source", "task", "excerpt"] as const;

export type ConnectableRefType = (typeof CONNECTABLE_REF_TYPES)[number];

export interface KnowledgeRef {
  id: string;
  type: KnowledgeRefType;
}

/**
 * Describes where a payload came from without coupling it to a route or domain record.
 * `workflowId` may identify a persisted workflow, while `traceId` correlates ephemeral
 * handoffs that do not have a domain record of their own.
 */
export interface InteractionProvenance {
  surface: string;
  workflowId?: string;
  traceId?: string;
  label?: string;
}

export type InteractionPayloadKind = "knowledge" | "set";

export interface InteractionPayload {
  version: typeof INTERACTION_PAYLOAD_VERSION;
  kind: InteractionPayloadKind;
  items: KnowledgeRef[];
  origin?: InteractionProvenance;
}

export type InteractionIntent = "connect" | "apply-tag" | "include-in-rabbithole";

export type CanonicalRelationshipType = "connected" | "describes" | "includes";

export interface CanonicalRelationship {
  type: CanonicalRelationshipType;
  source: KnowledgeRef;
  target: KnowledgeRef;
}

export interface ResolvedRelationship {
  item: KnowledgeRef;
  intent: InteractionIntent;
  relationship: CanonicalRelationship;
}

export type ResolutionReasonCode =
  | "duplicate-item"
  | "relationship-exists"
  | "self-relationship"
  | "unsupported-relationship";

export interface ResolutionIssue {
  item: KnowledgeRef;
  code: ResolutionReasonCode;
  reason: string;
}

export type ResolutionStatus = "eligible" | "partial" | "invalid" | "noop";

/**
 * A mutation-free preview. Domain adapters may use `relationships` to perform
 * accepted operations and report their own pending/success/failure states.
 */
export interface ResolutionPreview {
  status: ResolutionStatus;
  intent: InteractionIntent | "mixed" | null;
  accepted: KnowledgeRef[];
  relationships: ResolvedRelationship[];
  rejected: ResolutionIssue[];
  noops: ResolutionIssue[];
}

export function isKnowledgeRefType(value: unknown): value is KnowledgeRefType {
  return typeof value === "string" && (KNOWLEDGE_REF_TYPES as readonly string[]).includes(value);
}

export function isConnectableRefType(type: KnowledgeRefType): type is ConnectableRefType {
  return (CONNECTABLE_REF_TYPES as readonly string[]).includes(type);
}

export function knowledgeRefKey(ref: KnowledgeRef): string {
  return `${ref.type}:${ref.id}`;
}

export function knowledgeRefsEqual(left: KnowledgeRef, right: KnowledgeRef): boolean {
  return left.type === right.type && left.id === right.id;
}
