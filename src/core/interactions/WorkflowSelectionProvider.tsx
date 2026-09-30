import { type ReactNode, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import {
  type SelectionStore,
  createSelectionStore,
  createSessionSelectionAdapter,
} from "./selectionStore";
import { type WorkflowSelectionContextValue, WorkflowSelectionContext } from "./workflowSelection";

export interface WorkflowSelectionProviderProps {
  children: ReactNode;
  /**
   * In-memory is the default lifetime. Enabling this opts into validated sessionStorage hydration
   * after mount, keeping the server and initial browser snapshots identical.
   */
  persistInSession?: boolean;
  /** Supply an identity-scoped key when the application can switch authenticated users. */
  sessionKey?: string;
}

function persistStoreInBrowser(store: SelectionStore, sessionKey?: string): () => void {
  let storage: Storage;
  try {
    storage = window.sessionStorage;
  } catch {
    return () => undefined;
  }

  const adapter = createSessionSelectionAdapter(storage, {
    ...(sessionKey ? { key: sessionKey } : {}),
  });
  const persisted = adapter.load();
  const current = store.getSnapshot().handoff;

  // An intentional in-memory selection wins if work occurred before browser hydration completed.
  if (!current && persisted) store.replace(persisted);
  else if (current) adapter.save(current);

  return store.subscribe(() => {
    const handoff = store.getSnapshot().handoff;
    if (handoff) adapter.save(handoff);
    else adapter.clear();
  });
}

export function WorkflowSelectionProvider({
  children,
  persistInSession = false,
  sessionKey,
}: WorkflowSelectionProviderProps) {
  // Provider ownership isolates separate React roots and avoids module-level state leaking between
  // application instances, SSR requests, stories, or tests. The lazy initializer is render-stable.
  const [store] = useState(() => createSelectionStore());
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  useEffect(() => {
    if (!persistInSession || typeof window === "undefined") return;
    return persistStoreInBrowser(store, sessionKey);
  }, [persistInSession, sessionKey, store]);

  const value = useMemo<WorkflowSelectionContextValue>(
    () => ({
      handoff: snapshot.handoff,
      revision: snapshot.revision,
      replace: store.replace,
      refine: store.refine,
      clear: store.clear,
    }),
    [snapshot, store]
  );

  return (
    <WorkflowSelectionContext.Provider value={value}>{children}</WorkflowSelectionContext.Provider>
  );
}
