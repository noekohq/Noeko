import {
  type CanonicalRelationship,
  type InteractionIntent,
  type InteractionPayload,
  type KnowledgeRef,
  type ResolutionIssue,
  type ResolutionPreview,
  type ResolvedRelationship,
  isConnectableRefType,
  knowledgeRefKey,
  knowledgeRefsEqual,
} from "./contracts";

export interface ResolveRelationshipsOptions {
  /**
   * Optional caller knowledge used only to classify already-persisted relationships as no-ops.
   * The resolver never loads records or performs a mutation.
   */
  relationshipExists?: (relationship: CanonicalRelationship) => boolean;
}

function relationshipFor(
  item: KnowledgeRef,
  target: KnowledgeRef
): Omit<ResolvedRelationship, "item"> | null {
  if (isConnectableRefType(item.type) && isConnectableRefType(target.type)) {
    return {
      intent: "connect",
      relationship: { type: "connected", source: item, target },
    };
  }

  if (isConnectableRefType(item.type) && target.type === "tag") {
    return {
      intent: "apply-tag",
      relationship: { type: "describes", source: target, target: item },
    };
  }

  if (item.type === "tag" && isConnectableRefType(target.type)) {
    return {
      intent: "apply-tag",
      relationship: { type: "describes", source: item, target },
    };
  }

  if ((isConnectableRefType(item.type) || item.type === "tag") && target.type === "rabbithole") {
    return {
      intent: "include-in-rabbithole",
      relationship: { type: "includes", source: target, target: item },
    };
  }

  if (item.type === "rabbithole" && (isConnectableRefType(target.type) || target.type === "tag")) {
    return {
      intent: "include-in-rabbithole",
      relationship: { type: "includes", source: item, target },
    };
  }

  return null;
}

function issue(item: KnowledgeRef, code: ResolutionIssue["code"], reason: string): ResolutionIssue {
  return { item, code, reason };
}

function statusFor(preview: Pick<ResolutionPreview, "accepted" | "rejected" | "noops">) {
  if (preview.accepted.length > 0) {
    return preview.rejected.length > 0 || preview.noops.length > 0 ? "partial" : "eligible";
  }
  return preview.noops.length > 0 && preview.rejected.length === 0 ? "noop" : "invalid";
}

function commonIntent(relationships: ResolvedRelationship[]): InteractionIntent | "mixed" | null {
  const first = relationships[0]?.intent;
  if (!first) return null;
  return relationships.every(({ intent }) => intent === first) ? first : "mixed";
}

/**
 * Resolves gesture direction into canonical domain relationships. The result is a preview only;
 * domain-owned adapters remain responsible for authorization and persistence.
 */
export function resolveRelationships(
  payload: InteractionPayload,
  target: KnowledgeRef,
  options: ResolveRelationshipsOptions = {}
): ResolutionPreview {
  const relationships: ResolvedRelationship[] = [];
  const rejected: ResolutionIssue[] = [];
  const noops: ResolutionIssue[] = [];
  const seen = new Set<string>();

  for (const item of payload.items) {
    const key = knowledgeRefKey(item);
    if (seen.has(key)) {
      noops.push(issue(item, "duplicate-item", "This item is already present in the set."));
      continue;
    }
    seen.add(key);

    if (knowledgeRefsEqual(item, target)) {
      noops.push(issue(item, "self-relationship", "An item cannot relate to itself."));
      continue;
    }

    const resolved = relationshipFor(item, target);
    if (!resolved) {
      rejected.push(
        issue(
          item,
          "unsupported-relationship",
          `${item.type} cannot be related to ${target.type} by this interaction.`
        )
      );
      continue;
    }

    if (options.relationshipExists?.(resolved.relationship)) {
      noops.push(issue(item, "relationship-exists", "The canonical relationship already exists."));
      continue;
    }

    relationships.push({ item, ...resolved });
  }

  const accepted = relationships.map(({ item }) => item);
  return {
    status: statusFor({ accepted, rejected, noops }),
    intent: commonIntent(relationships),
    accepted,
    relationships,
    rejected,
    noops,
  };
}
