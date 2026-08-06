import { createContext, useContext } from "react";

import type { KnowledgeRef } from "./contracts";
import type { SelectionHandoff } from "./selection";
import type { RefineSelectionOptions } from "./selectionStore";

export interface WorkflowSelectionContextValue {
  handoff: SelectionHandoff | null;
  revision: number;
  replace(handoff: SelectionHandoff): void;
  refine(items: readonly KnowledgeRef[], options?: RefineSelectionOptions): void;
  clear(): void;
}

export const WorkflowSelectionContext = createContext<WorkflowSelectionContextValue | null>(null);

/** Accesses graph/workflow selection only; it never reads or writes editor text selection. */
export function useWorkflowSelection(): WorkflowSelectionContextValue {
  const context = useContext(WorkflowSelectionContext);
  if (!context) {
    throw new Error("useWorkflowSelection must be used within a WorkflowSelectionProvider");
  }
  return context;
}
