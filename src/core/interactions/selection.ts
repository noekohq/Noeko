import {
  type InteractionProvenance,
  type KnowledgeRef,
  isKnowledgeRefType,
  knowledgeRefKey,
} from "./contracts";

export const SELECTION_HANDOFF_VERSION = 1 as const;
export const SELECTION_HANDOFF_KIND = "knowledge-selection" as const;

const MAX_SELECTION_ITEMS = 500;
const MAX_TEXT_LENGTH = 2_000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1_000;

/** A readable reason attached to a member of an ordered narrative result. */
export interface SelectionStepExplanation {
  item: KnowledgeRef;
  explanation: string;
}

/**
 * Provenance belongs to the selection as a workflow object, not to editor text selection.
 * `runId` identifies one execution of a workflow such as Spyglass; `workflowId` may identify
 * the longer-lived workflow that produced it.
 */
export interface SelectionProvenance extends InteractionProvenance {
  runId?: string;
  query?: string;
  steps?: SelectionStepExplanation[];
}

/**
 * A structured-clone-safe handoff for graph/set selection. Item order is meaningful and items
 * must be unique. This contract is deliberately distinct from editor-native text selection.
 */
export interface SelectionHandoff {
  version: typeof SELECTION_HANDOFF_VERSION;
  kind: typeof SELECTION_HANDOFF_KIND;
  items: KnowledgeRef[];
  origin: SelectionProvenance;
  createdAt: number;
  updatedAt: number;
}

export interface ParseSelectionHandoffOptions {
  /** Reject handoffs that have not been updated within this duration. Omit for route state. */
  maxAgeMs?: number;
  /** Injectable clock for deterministic consumers. */
  now?: number;
}

export interface CreateSelectionHandoffInput {
  items: readonly KnowledgeRef[];
  origin: SelectionProvenance;
  now?: number;
}

export class SelectionHandoffValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SelectionHandoffValidationError";
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= MAX_TEXT_LENGTH;
}

function parseKnowledgeRef(value: unknown): KnowledgeRef | null {
  if (!isObject(value) || !isNonEmptyString(value.id) || !isKnowledgeRefType(value.type)) {
    return null;
  }

  return { id: value.id, type: value.type };
}

function parseItems(value: unknown): KnowledgeRef[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_SELECTION_ITEMS)
    return null;

  const items: KnowledgeRef[] = [];
  const seen = new Set<string>();
  for (const valueItem of value) {
    const item = parseKnowledgeRef(valueItem);
    if (!item || seen.has(knowledgeRefKey(item))) return null;
    seen.add(knowledgeRefKey(item));
    items.push(item);
  }

  return items;
}

function optionalString(value: unknown): string | undefined | null {
  if (value === undefined) return undefined;
  return isNonEmptyString(value) ? value : null;
}

function parseProvenance(
  value: unknown,
  items: readonly KnowledgeRef[]
): SelectionProvenance | null {
  if (!isObject(value) || !isNonEmptyString(value.surface)) return null;

  const workflowId = optionalString(value.workflowId);
  const runId = optionalString(value.runId);
  const traceId = optionalString(value.traceId);
  const label = optionalString(value.label);
  const query = optionalString(value.query);
  if ([workflowId, runId, traceId, label, query].some((entry) => entry === null)) return null;

  let steps: SelectionStepExplanation[] | undefined;
  if (value.steps !== undefined) {
    if (!Array.isArray(value.steps) || value.steps.length > items.length) return null;

    const itemKeys = new Set(items.map(knowledgeRefKey));
    const explained = new Set<string>();
    steps = [];
    for (const valueStep of value.steps) {
      if (!isObject(valueStep) || !isNonEmptyString(valueStep.explanation)) return null;
      const item = parseKnowledgeRef(valueStep.item);
      if (!item) return null;
      const key = knowledgeRefKey(item);
      if (!itemKeys.has(key) || explained.has(key)) return null;
      explained.add(key);
      steps.push({ item, explanation: valueStep.explanation });
    }
  }

  return {
    surface: value.surface,
    ...(workflowId ? { workflowId } : {}),
    ...(runId ? { runId } : {}),
    ...(traceId ? { traceId } : {}),
    ...(label ? { label } : {}),
    ...(query ? { query } : {}),
    ...(steps ? { steps } : {}),
  };
}

function parseTimestamp(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function parseSelectionHandoff(
  value: unknown,
  options: ParseSelectionHandoffOptions = {}
): SelectionHandoff | null {
  if (
    !isObject(value) ||
    value.version !== SELECTION_HANDOFF_VERSION ||
    value.kind !== SELECTION_HANDOFF_KIND
  ) {
    return null;
  }

  const items = parseItems(value.items);
  const createdAt = parseTimestamp(value.createdAt);
  const updatedAt = parseTimestamp(value.updatedAt);
  if (!items || createdAt === null || updatedAt === null || updatedAt < createdAt) return null;

  const origin = parseProvenance(value.origin, items);
  if (!origin) return null;

  const now = options.now ?? Date.now();
  if (createdAt > now + MAX_CLOCK_SKEW_MS || updatedAt > now + MAX_CLOCK_SKEW_MS) return null;
  if (
    options.maxAgeMs !== undefined &&
    (!Number.isFinite(options.maxAgeMs) ||
      options.maxAgeMs < 0 ||
      now - updatedAt > options.maxAgeMs)
  ) {
    return null;
  }

  return {
    version: SELECTION_HANDOFF_VERSION,
    kind: SELECTION_HANDOFF_KIND,
    items,
    origin,
    createdAt,
    updatedAt,
  };
}

export function isSelectionHandoff(value: unknown): value is SelectionHandoff {
  return parseSelectionHandoff(value) !== null;
}

export function createSelectionHandoff(input: CreateSelectionHandoffInput): SelectionHandoff {
  const now = input.now ?? Date.now();
  const handoff: SelectionHandoff = {
    version: SELECTION_HANDOFF_VERSION,
    kind: SELECTION_HANDOFF_KIND,
    items: [...input.items],
    origin: input.origin,
    createdAt: now,
    updatedAt: now,
  };
  const parsed = parseSelectionHandoff(handoff, { now });
  if (!parsed)
    throw new SelectionHandoffValidationError("Cannot create an invalid selection handoff");
  return parsed;
}

export function serializeSelectionHandoff(handoff: SelectionHandoff): string {
  const parsed = parseSelectionHandoff(handoff);
  if (!parsed) {
    throw new SelectionHandoffValidationError("Cannot serialize an invalid selection handoff");
  }
  return JSON.stringify(parsed);
}

export function parseSerializedSelectionHandoff(
  serialized: string,
  options: ParseSelectionHandoffOptions = {}
): SelectionHandoff | null {
  if (!serialized.trim()) return null;
  try {
    return parseSelectionHandoff(JSON.parse(serialized) as unknown, options);
  } catch {
    return null;
  }
}
