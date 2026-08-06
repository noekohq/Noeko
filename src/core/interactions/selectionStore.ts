import {
  type ParseSelectionHandoffOptions,
  type SelectionHandoff,
  type SelectionProvenance,
  SelectionHandoffValidationError,
  parseSelectionHandoff,
  parseSerializedSelectionHandoff,
  serializeSelectionHandoff,
} from "./selection";
import { type KnowledgeRef, knowledgeRefKey } from "./contracts";

export const DEFAULT_SELECTION_SESSION_KEY = "noeko:knowledge-selection:v1";
export const DEFAULT_SELECTION_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1_000;

export interface SelectionPersistenceAdapter {
  load(): SelectionHandoff | null;
  save(handoff: SelectionHandoff): void;
  clear(): void;
}

/** The subset of Storage needed by the opt-in browser session adapter. */
export interface SelectionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SessionSelectionAdapterOptions extends ParseSelectionHandoffOptions {
  key?: string;
}

export interface SelectionStoreSnapshot {
  handoff: SelectionHandoff | null;
  revision: number;
}

export interface RefineSelectionOptions {
  /** Defaults to preserving the current provenance. */
  origin?: SelectionProvenance;
  now?: number;
}

export interface CreateSelectionStoreOptions {
  initial?: SelectionHandoff | null;
  /** Persistence is opt-in. Without an adapter, the store has in-memory lifetime only. */
  persistence?: SelectionPersistenceAdapter;
  now?: () => number;
}

export interface SelectionStore {
  getSnapshot(): SelectionStoreSnapshot;
  subscribe(listener: () => void): () => void;
  replace(handoff: SelectionHandoff): void;
  refine(items: readonly KnowledgeRef[], options?: RefineSelectionOptions): void;
  clear(): void;
}

/**
 * Opt-in session persistence. Callers pass `window.sessionStorage` explicitly so importing this
 * module remains safe during SSR. Malformed, stale, or future-dated values are removed on load.
 */
export function createSessionSelectionAdapter(
  storage: SelectionStorage,
  options: SessionSelectionAdapterOptions = {}
): SelectionPersistenceAdapter {
  const key = options.key ?? DEFAULT_SELECTION_SESSION_KEY;
  const maxAgeMs = options.maxAgeMs ?? DEFAULT_SELECTION_SESSION_MAX_AGE_MS;

  return {
    load() {
      let serialized: string | null;
      try {
        serialized = storage.getItem(key);
      } catch {
        return null;
      }
      if (serialized === null) return null;

      const handoff = parseSerializedSelectionHandoff(serialized, {
        maxAgeMs,
        ...(options.now !== undefined ? { now: options.now } : {}),
      });
      if (handoff) return handoff;

      try {
        storage.removeItem(key);
      } catch {
        // Storage denial should not prevent an in-memory handoff.
      }
      return null;
    },
    save(handoff) {
      try {
        storage.setItem(key, serializeSelectionHandoff(handoff));
      } catch {
        // Quota and privacy restrictions must not break the in-memory selection.
      }
    },
    clear() {
      try {
        storage.removeItem(key);
      } catch {
        // The in-memory store can still clear even when browser storage is unavailable.
      }
    },
  };
}

/**
 * React-free external store for workflow selection. Replacement accepts a complete handoff;
 * refinement changes ordered members while preserving provenance and the original creation time.
 */
export function createSelectionStore(options: CreateSelectionStoreOptions = {}): SelectionStore {
  const clock = options.now ?? Date.now;
  const persisted = options.persistence?.load() ?? null;
  const initial = options.initial === undefined ? persisted : options.initial;
  const parsedInitial = initial ? parseSelectionHandoff(initial, { now: clock() }) : null;
  if (initial && !parsedInitial) {
    throw new SelectionHandoffValidationError(
      "Cannot initialize a selection store with invalid data"
    );
  }

  let snapshot: SelectionStoreSnapshot = { handoff: parsedInitial, revision: 0 };
  const listeners = new Set<() => void>();

  const commit = (handoff: SelectionHandoff | null) => {
    snapshot = { handoff, revision: snapshot.revision + 1 };
    if (handoff) options.persistence?.save(handoff);
    else options.persistence?.clear();
    listeners.forEach((listener) => listener());
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    replace(handoff) {
      const parsed = parseSelectionHandoff(handoff, { now: clock() });
      if (!parsed)
        throw new SelectionHandoffValidationError("Cannot replace selection with invalid data");
      commit(parsed);
    },
    refine(items, refineOptions = {}) {
      const current = snapshot.handoff;
      if (!current) {
        throw new SelectionHandoffValidationError("Cannot refine an empty selection");
      }
      const now = refineOptions.now ?? clock();
      const itemKeys = new Set(items.map(knowledgeRefKey));
      const preservedOrigin = current.origin.steps
        ? {
            ...current.origin,
            steps: current.origin.steps.filter(({ item }) => itemKeys.has(knowledgeRefKey(item))),
          }
        : current.origin;
      const refined = parseSelectionHandoff(
        {
          ...current,
          items: [...items],
          origin: refineOptions.origin ?? preservedOrigin,
          updatedAt: now,
        },
        { now }
      );
      if (!refined)
        throw new SelectionHandoffValidationError("Cannot refine selection with invalid data");
      commit(refined);
    },
    clear() {
      commit(null);
    },
  };
}
