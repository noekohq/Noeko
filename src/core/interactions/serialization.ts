import {
  INTERACTION_PAYLOAD_VERSION,
  type InteractionPayload,
  type InteractionPayloadKind,
  type InteractionProvenance,
  type KnowledgeRef,
  type KnowledgeRefType,
  isKnowledgeRefType,
} from "./contracts";

export const INTERACTION_MIME_TYPE = "application/vnd.noeko.interaction.v1+json";
export const LEGACY_INTERACTION_MIME_TYPE = "application/json";

export interface ParseInteractionPayloadOptions {
  /** Required to safely upgrade a legacy `{ thingId }` payload that has no type. */
  legacyType?: KnowledgeRefType;
}

export interface InteractionDataTransfer {
  getData(format: string): string;
  setData(format: string, data: string): void;
}

export class InteractionPayloadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InteractionPayloadValidationError";
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseKnowledgeRef(value: unknown): KnowledgeRef | null {
  if (!isObject(value) || !isNonEmptyString(value.id) || !isKnowledgeRefType(value.type)) {
    return null;
  }

  return { id: value.id, type: value.type };
}

function parseProvenance(value: unknown): InteractionProvenance | null {
  if (!isObject(value) || !isNonEmptyString(value.surface)) return null;

  const optionalKeys = ["workflowId", "traceId", "label"] as const;
  if (optionalKeys.some((key) => value[key] !== undefined && !isNonEmptyString(value[key]))) {
    return null;
  }

  return {
    surface: value.surface,
    ...(typeof value.workflowId === "string" ? { workflowId: value.workflowId } : {}),
    ...(typeof value.traceId === "string" ? { traceId: value.traceId } : {}),
    ...(typeof value.label === "string" ? { label: value.label } : {}),
  };
}

function isPayloadKind(value: unknown): value is InteractionPayloadKind {
  return value === "knowledge" || value === "set";
}

export function parseInteractionPayload(value: unknown): InteractionPayload | null {
  if (
    !isObject(value) ||
    value.version !== INTERACTION_PAYLOAD_VERSION ||
    !isPayloadKind(value.kind) ||
    !Array.isArray(value.items) ||
    value.items.length === 0
  ) {
    return null;
  }

  const items = value.items.map(parseKnowledgeRef);
  if (items.some((item) => item === null)) return null;
  if (value.kind === "knowledge" && items.length !== 1) return null;

  const origin = value.origin === undefined ? undefined : parseProvenance(value.origin);
  if (value.origin !== undefined && origin === null) return null;

  return {
    version: INTERACTION_PAYLOAD_VERSION,
    kind: value.kind,
    items: items as KnowledgeRef[],
    ...(origin ? { origin } : {}),
  };
}

export function isInteractionPayload(value: unknown): value is InteractionPayload {
  return parseInteractionPayload(value) !== null;
}

export function serializeInteractionPayload(payload: InteractionPayload): string {
  const validated = parseInteractionPayload(payload);
  if (!validated) {
    throw new InteractionPayloadValidationError("Cannot serialize an invalid interaction payload");
  }

  return JSON.stringify(validated);
}

function parseJson(value: string): unknown | null {
  if (!value.trim()) return null;

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export function parseSerializedInteractionPayload(value: string): InteractionPayload | null {
  return parseInteractionPayload(parseJson(value));
}

function parseLegacyPayload(
  value: string,
  options: ParseInteractionPayloadOptions
): InteractionPayload | null {
  const parsed = parseJson(value);

  // During migration, canonical payloads copied under application/json remain safe to consume.
  const canonical = parseInteractionPayload(parsed);
  if (canonical) return canonical;

  if (!isObject(parsed) || !isNonEmptyString(parsed.thingId)) return null;

  const embeddedType = isKnowledgeRefType(parsed.thingType)
    ? parsed.thingType
    : isKnowledgeRefType(parsed.type)
      ? parsed.type
      : undefined;
  const type = embeddedType ?? options.legacyType;
  if (!type) return null;

  return {
    version: INTERACTION_PAYLOAD_VERSION,
    kind: "knowledge",
    items: [{ id: parsed.thingId, type }],
  };
}

/** Reads the canonical format first, then conservatively upgrades legacy JSON. */
export function readInteractionPayload(
  transfer: Pick<InteractionDataTransfer, "getData">,
  options: ParseInteractionPayloadOptions = {}
): InteractionPayload | null {
  const canonical = parseSerializedInteractionPayload(transfer.getData(INTERACTION_MIME_TYPE));
  if (canonical) return canonical;

  return parseLegacyPayload(transfer.getData(LEGACY_INTERACTION_MIME_TYPE), options);
}

/** Writes only the canonical format. Migration callers may separately emit a legacy fallback. */
export function writeInteractionPayload(
  transfer: Pick<InteractionDataTransfer, "setData">,
  payload: InteractionPayload
): void {
  transfer.setData(INTERACTION_MIME_TYPE, serializeInteractionPayload(payload));
}
