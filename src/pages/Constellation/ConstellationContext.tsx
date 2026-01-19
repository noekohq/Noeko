import { Group, Stack, Text } from "@mantine/core";
import { useGraph } from "../../contexts/GraphContext";
import { IEdge, IGraph, INode } from "../../declarations/graph";
import { useSearch } from "../../contexts/SearchContext";
import styles from "./ConstellationContext.module.scss";
import { GraphOrganizer } from "../../components/Display/Interactions/GraphOrganizer/GraphOrganizer";
import ScopeBuilder from "../../components/Search/ScopeBuilder/ScopeBuilder";
import { useCallback, useMemo, useEffect } from "react";
import PaperThing from "../../components/Display/Paper/Things/PaperThing";
import { UserIcon } from "@phosphor-icons/react";
import PaperChip from "../../components/Display/Paper/PaperChip";
import { useLandscape } from "../../contexts/LandscapeContext";

type ConstellationContextProps = {
  graph: IGraph | null;
  reloadGraph: () => Promise<void>;
  addNode?: (node: INode) => void;
  addEdge?: (edge: IEdge) => void;
};

export default function ConstellationContext({
  graph,
  reloadGraph,
}: ConstellationContextProps) {
  const { nodes, edges } = graph || { nodes: [], edges: [] };
  const {
    selected: { get: selected, clear: clearSelected, remove: removeSelected, add: addToSelection },
    focused: { set: setFocused },
  } = useGraph();

  const {
    global: {
      scope: { get: scope, set: setScope },
    },
  } = useSearch();

  const {
    rabbitholes: {
      entered: { get: currentRabbithole },
    },
  } = useLandscape();

  const handleScopeChange = useCallback(
    (newScope: any) => {
      const oldTags = scope.tags?.set || [];
      const newTags = newScope.tags?.set || [];
      
      // Find newly added tags
      const addedTags = newTags.filter((id: string) => !oldTags.includes(id));
      
      // Auto-select newly added tag nodes
      if (addedTags.length > 0) {
        const matchingTagNodes = nodes.filter(
          (node) => node.type === "tag" && 
                    addedTags.some((tagId: string) => node.id.toString() === tagId)
        );
        matchingTagNodes.forEach((tag) => addToSelection(tag.id.toString()));
      }
      
      setScope(newScope);
    },
    [setScope, scope, nodes, addToSelection],
  );

  const toggleShowShared = useCallback(() => {
    setScope({ ...scope, showShared: !scope.showShared });
  }, [scope, setScope]);

  const toggleShowFriends = useCallback(() => {
    setScope({ ...scope, showFriends: !scope.showFriends });
  }, [scope, setScope]);

  // Auto-select rabbithole when it changes
  useEffect(() => {
    if (currentRabbithole) {
      const rhNode = nodes.find(
        (node) => node.type === "rabbithole" && 
                  node.id.toString() === currentRabbithole.id.toString()
      );
      if (rhNode) {
        addToSelection(rhNode.id.toString());
      }
    }
  }, [currentRabbithole, nodes, addToSelection]);

  // Auto-select filtered items on initial load
  useEffect(() => {
    // Select tags if any are in initial scope
    if (scope.tags?.set?.length) {
      const matchingTagNodes = nodes.filter(
        (node) => node.type === "tag" && 
                  scope.tags!.set.some((tagId: string | import('surrealdb').RecordId) => 
                    node.id.toString() === tagId.toString()
                  )
      );
      matchingTagNodes.forEach((tag) => addToSelection(tag.id.toString()));
    }
    
    // Select rabbithole if one exists on initial load
    if (currentRabbithole) {
      const rhNode = nodes.find(
        (node) => node.type === "rabbithole" && 
                  node.id.toString() === currentRabbithole.id.toString()
      );
      if (rhNode) {
        addToSelection(rhNode.id.toString());
      }
    }
  }, []); // Empty deps - only run once on mount

  // Filter user nodes (friends) from the graph
  const friendNodes = useMemo(() => {
    return nodes.filter((node) => node.type === "user");
  }, [nodes]);

  const statusText = () => {
    const filterCount = 
      (scope.tags?.set.length || 0) + 
      (currentRabbithole ? 1 : 0) + 
      (scope.date ? 1 : 0);
    
    const filterText = filterCount > 0 
      ? ` • ${filterCount} filter${filterCount === 1 ? '' : 's'} active`
      : '';
    
    return `${nodes.length} node${nodes.length === 1 ? "" : "s"}, ${edges.length} connection${edges.length === 1 ? "" : "s"}${filterText}`;
  };

  return (
    <div className={styles.constellationContext}>
      <Stack gap="md">
        <Text c="dimmed" size="sm">
          {statusText()}
        </Text>

        <Stack gap="xs">
          <Text size="xs" fw="bold" c="dimmed">
            VISIBILITY
          </Text>
          
          <ScopeBuilder value={scope} onChange={handleScopeChange} />
          
          <Group gap="xs">
            <PaperChip
              size="compact"
              active={!!scope.showShared}
              onClick={toggleShowShared}
            >
              Show Shared
            </PaperChip>
            <PaperChip
              size="compact"
              active={!!scope.showFriends}
              onClick={toggleShowFriends}
            >
              Show Friends
            </PaperChip>
          </Group>
        </Stack>

        {scope.showFriends && friendNodes.length > 0 && (
          <Stack gap="xs">
            <Text size="xs" fw="bold" c="dimmed">
              FRIENDS
            </Text>
            <Stack gap="xs">
              {friendNodes.map((node) => {
                // Type assertion since we filtered for user nodes
                const userNode = node as import("../../declarations/graph").IUserNode;
                const fullName = `${userNode.firstName} ${userNode.lastName}`.trim() || "Friend";
                return (
                  <PaperThing
                    key={node.id}
                    id={node.id.toString()}
                    title={fullName}
                    detail=""
                    icon={UserIcon}
                    state="default"
                    onClick={() => setFocused(node.id.toString())}
                  />
                );
              })}
            </Stack>
          </Stack>
        )}

        <GraphOrganizer nodes={nodes} />
      </Stack>
    </div>
  );
}
