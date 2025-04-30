import { Flex, Group, Space, Text } from "@mantine/core";
import { IDBGraph } from "../../../app/database/models/ideas";
import { useGraph } from "../../contexts/GraphContext";
import { INode } from "../../declarations/graph";
import { formatDate } from "../../utils/formatting";
import { useAuth } from "../../contexts/AuthContext";
import { getCurrentTimeOfDay, getTimeOfDay } from "../../utils/datetime";

type GraphNavigationProps = {
  reloadGraph: () => Promise<void>;
  nodes: INode[];
  flags?: IDBGraph["flags"];
};

export const GraphNavigation = ({
  reloadGraph,
  nodes,
  flags,
}: GraphNavigationProps) => {
  const {
    selected: { get: getSelectedNode },
  } = useGraph();

  const { user } = useAuth();

  const selectedNode = getSelectedNode();

  const getNodeSubtitle = (node: INode) => {
    if (node.type === "idea") {
      return formatDate(node.createdAt);
    }
    if (node.type === "file") {
      return formatDate(node.createdAt);
    }
    if (node.type === "derived") {
      return node.type;
    }
  };

  const getNodeTitle = (node: INode) => {
    if (node.type === "idea") {
      return node.title;
    }
    if (node.type === "file") {
      return node.originalFileName;
    }
  };

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const currentNode = selectedNode ? nodeMap.get(selectedNode) : null;

  const defaultText = () => {
    return `Hello ${user?.firstName || "Guest"}, it is ${getCurrentTimeOfDay()}, you currently have ${nodes.length} node${nodes.length === 1 ? "" : "s"}.`;
  };

  const statusText = () => {
    let text = "";
    if (!flags?.embeddings.synced) {
      text += "Embeddings out of sync. ";
    }
    return text || defaultText();
  };

  return (
    <div>
      <Group justify="end">
        <Text c="dimmed" size="sm">
          {statusText()}
        </Text>
      </Group>
      <Space h="md" />
      <Group>
        {currentNode && (
          <Flex direction="column">
            <Text fw="bold">{getNodeTitle(currentNode)}</Text>
            <Text fw="normal" size="xs" c="dimmed">
              {getNodeSubtitle(currentNode)}
            </Text>
          </Flex>
        )}
      </Group>
    </div>
  );
};
