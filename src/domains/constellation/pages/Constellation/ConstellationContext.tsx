import { useCallback, useEffect, useMemo, useRef } from "react";
import type { IGraph, INode } from "@/declarations/graph";
import { useGraph } from "@domains/constellation/contexts/GraphContext";
import { useSearch } from "@domains/discovery/contexts/SearchContext";
import { useLandscape } from "@/contexts/LandscapeContext";
<<<<<<< HEAD
import { IConstellationLoader } from "../../../../../shared/types/constellation";
import { RecordId } from "surrealdb";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
=======
import {
  ConstellationSidebar,
  SharedModeControl,
  type LandscapeFilter,
  type LandscapeNotice,
} from "@domains/constellation/components/Sidebar";
import { WorkingSetActions } from "@domains/constellation/components/Sidebar/WorkingSetActions";
import { useWorkflowSelection } from "@core/interactions";
import {
  getNodeDescription,
  getNodeLink,
  getNodeTitle,
  NodeIcon,
} from "@infrastructure/graph/utils";
>>>>>>> dbc6393673ec1b06aa8a23ecdd01967fe1e94466

type ConstellationContextProps = {
  graph: IGraph;
  semanticLensActive: boolean;
  semanticUnavailableCount: number;
  landscapeLoading: boolean;
  onSemanticLensChange: (active: boolean) => void;
  onExploreSemantic: (node: INode) => void;
  onTraceSelection: () => void;
  onClearSelection: () => void;
  onMutationComplete: () => void;
};

export default function ConstellationContext({
  graph,
  semanticLensActive,
  semanticUnavailableCount,
  landscapeLoading,
  onSemanticLensChange,
  onExploreSemantic,
  onTraceSelection,
  onClearSelection,
  onMutationComplete,
}: ConstellationContextProps) {
<<<<<<< HEAD
  const { i18n } = useLingui();
  const { nodes, edges } = graph || { nodes: [], edges: [] };
=======
  const { nodes, edges } = graph;
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id.toString(), node])), [nodes]);
>>>>>>> dbc6393673ec1b06aa8a23ecdd01967fe1e94466
  const {
    selected: {
      get: selected,
      set: setSelected,
      add: addToSelection,
      removeMany: removeManySelected,
      clear: clearSelected,
    },
    focused: { set: setFocused },
  } = useGraph();
  const workflowSelection = useWorkflowSelection();
  const lastAppliedHandoff = useRef<number | null>(null);

  const {
    global: {
      scope: { get: scope, set: setScope },
      scopeData: {
        tags: { get: scopeTags, remove: removeScopeTag },
      },
    },
  } = useSearch();
  const {
    rabbitholes: {
      entered: { get: currentRabbithole, set: setCurrentRabbithole },
    },
  } = useLandscape();

  useEffect(() => {
    if (currentRabbithole) {
      const node = nodeById.get(currentRabbithole.id.toString());
      if (node) addToSelection(node.id.toString());
    }
  }, [addToSelection, currentRabbithole, nodeById]);

  useEffect(() => {
    for (const tagId of scope.tags?.set || []) {
      const node = nodeById.get(tagId.toString());
      if (node?.type === "tag") addToSelection(node.id.toString());
    }
  }, [addToSelection, nodeById, scope.tags?.set]);

  useEffect(() => {
    const availableNodeIds = new Set(nodeById.keys());
    const staleSelectionIds = [...selected].filter((id) => !availableNodeIds.has(id));
    if (staleSelectionIds.length > 0) removeManySelected(staleSelectionIds);
  }, [nodeById, removeManySelected, selected]);

  useEffect(() => {
    const handoff = workflowSelection.handoff;
    if (!handoff || lastAppliedHandoff.current === handoff.updatedAt) return;
    lastAppliedHandoff.current = handoff.updatedAt;
    setSelected(handoff.items.map((item) => item.id).filter((id) => nodeById.has(id)));
  }, [nodeById, setSelected, workflowSelection.handoff, workflowSelection.revision]);

  const sharedModeActive = scope.showShared === true || scope.showFriends === true;
  const handleSharedModeChange = useCallback(
    (active: boolean) => {
      setScope({
        ...scope,
        showShared: active || undefined,
        showFriends: active || undefined,
      });
    },
    [scope, setScope]
  );

  const filters = useMemo<LandscapeFilter[]>(() => {
    const active: LandscapeFilter[] = [];
    for (const tagId of scope.tags?.set || []) {
      const tag = scopeTags.find((candidate) => candidate.id.toString() === tagId.toString());
      active.push({ id: `tag:${tagId.toString()}`, label: tag?.name || "Tag" });
    }
    if (currentRabbithole || scope.rabbithole) {
      active.push({
        id: "rabbithole",
        label: currentRabbithole?.name || "Rabbithole",
      });
    }
    if (scope.date) active.push({ id: "date", label: "Date range" });
    if (sharedModeActive) active.push({ id: "shared", label: "Shared" });
    return active;
  }, [
    currentRabbithole,
    scope.date,
    scope.rabbithole,
    scope.tags?.set,
    scopeTags,
    sharedModeActive,
  ]);

  const handleRemoveFilter = useCallback(
    (filterId: string) => {
      if (filterId.startsWith("tag:")) {
        removeScopeTag(filterId.slice(4));
      } else if (filterId === "rabbithole") {
        setCurrentRabbithole(null);
        setScope({ ...scope, rabbithole: undefined });
      } else if (filterId === "date") {
        setScope({ ...scope, date: undefined });
      } else if (filterId === "shared") {
        handleSharedModeChange(false);
      }
    },
    [handleSharedModeChange, removeScopeTag, scope, setCurrentRabbithole, setScope]
  );

  const handleReset = useCallback(() => {
    setCurrentRabbithole(null);
    setScope({});
    onSemanticLensChange(false);
  }, [onSemanticLensChange, setCurrentRabbithole, setScope]);

  const selectionItems = useMemo(
    () =>
      [...selected].flatMap((id) => {
        const node = nodeById.get(id);
        if (!node) return [];
        return [
          {
            id,
            title: getNodeTitle(node) || "Untitled node",
            detail: getNodeDescription(node),
            icon: NodeIcon(node),
            link: getNodeLink(node),
          },
        ];
      }),
    [nodeById, selected]
  );

  const handleClearSelection = useCallback(() => {
    clearSelected();
    workflowSelection.clear();
    onClearSelection();
  }, [clearSelected, onClearSelection, workflowSelection]);

  const notices = useMemo<LandscapeNotice[]>(() => {
    if (!semanticLensActive || semanticUnavailableCount === 0) return [];
    return [
      {
        id: "semantic-outside-snapshot",
        tone: "info",
        message: `${semanticUnavailableCount} semantic result${semanticUnavailableCount === 1 ? " is" : "s are"} outside the current landscape.`,
      },
    ];
  }, [semanticLensActive, semanticUnavailableCount]);

  return (
    <ConstellationSidebar
      landscape={{
        perspective: "mine",
        filters,
        onRemoveFilter: handleRemoveFilter,
        nodeCount: nodes.length,
        relationshipCount: edges.length,
        state: landscapeLoading
          ? { status: "loading", message: "Updating the landscape…" }
          : undefined,
        onReset: handleReset,
        notices,
        controls: <SharedModeControl active={sharedModeActive} onChange={handleSharedModeChange} />,
      }}
      selection={{
        items: selectionItems,
        provenance: workflowSelection.handoff
          ? {
              label:
                workflowSelection.handoff.origin.label || workflowSelection.handoff.origin.surface,
              detail: workflowSelection.handoff.origin.query,
            }
          : undefined,
        onClear: handleClearSelection,
        onFocusItem: setFocused,
        actionContent: (
          <WorkingSetActions
            graph={graph}
            onTrace={onTraceSelection}
            onMutationComplete={onMutationComplete}
          />
        ),
        onExploreRelated: (itemId) => {
          const node = nodeById.get(itemId);
          if (node) onExploreSemantic(node);
        },
      }}
    />
  );
}
