import { Group, Stack, Text } from "@mantine/core";
import { useGraph } from '@domains/constellation/contexts/GraphContext';
import { IEdge, IGraph, INode } from '@/declarations/graph';
import { useSearch } from '@domains/discovery/contexts/SearchContext';
import styles from "./ConstellationContext.module.scss";
import { GraphOrganizer } from '@/components/Display/Interactions/GraphOrganizer/GraphOrganizer';
import ScopeBuilder from '@domains/discovery/components/Search/ScopeBuilder/ScopeBuilder';
import { useCallback, useMemo, useEffect } from "react";
import PaperThing from '@core/design/components/Paper/Things/PaperThing';
import { UserIcon } from "@phosphor-icons/react";
import PaperChip from '@core/design/components/Paper/PaperChip';
import { useLandscape } from '@/contexts/LandscapeContext';
import { IConstellationLoader } from '../../../../../shared/types/constellation';

type ConstellationContextProps = {
  graph: IGraph | null;
  reloadGraph: () => Promise<void>;
  addNode?: (node: INode) => void;
  addEdge?: (edge: IEdge) => void;
  loader: IConstellationLoader;
  setLoader: (loader: IConstellationLoader) => void;
};

export default function ConstellationContext({
  graph,
  reloadGraph,
  loader,
  setLoader,
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

  useEffect(() => {
    if (currentRabbithole) {
      const rhNode = nodes.find(
        (node) =>
          node.type === "rabbithole" && node.id.toString() === currentRabbithole.id.toString()
      );
      if (rhNode) {
        addToSelection(rhNode.id.toString());
      }
    }
  }, [currentRabbithole, nodes, addToSelection]);

  useEffect(() => {
    if (scope.tags?.set?.length) {
      const matchingTagNodes = nodes.filter(
        (node) =>
          node.type === "tag" &&
          scope.tags!.set.some(
            (tagId: string | import("surrealdb").RecordId) =>
              node.id.toString() === tagId.toString()
          )
      );
      matchingTagNodes.forEach((tag) => addToSelection(tag.id.toString()));
    }

    if (currentRabbithole) {
      const rhNode = nodes.find(
        (node) =>
          node.type === "rabbithole" && node.id.toString() === currentRabbithole.id.toString()
      );
      if (rhNode) {
        addToSelection(rhNode.id.toString());
      }
    }
  }, [scope]);

  const friendNodes = useMemo(() => {
    return nodes.filter((node) => node.type === "user");
  }, [nodes]);

  const statusText = () => {
    const filterCount =
      (scope.tags?.set.length || 0) + (currentRabbithole ? 1 : 0) + (scope.date ? 1 : 0);

    const filterText =
      filterCount > 0 ? ` • ${filterCount} filter${filterCount === 1 ? "" : "s"} active` : "";

    return `${nodes.length} node${nodes.length === 1 ? "" : "s"}, ${edges.length} connection${edges.length === 1 ? "" : "s"}${filterText}`;
  };

  return (
    <div className={styles.constellationContext}>
      <Stack gap="md">
        <Text c="dimmed" size="sm">
          {statusText()}
        </Text>

        {scope.showFriends && friendNodes.length > 0 && (
          <Stack gap="xs">
            <Text size="xs" fw="bold" c="dimmed">
              FRIENDS
            </Text>
            <Stack gap="xs">
              {friendNodes.map((node) => {
                // Type assertion since we filtered for user nodes
                const userNode = node as import('@/declarations/graph').IUserNode;
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
