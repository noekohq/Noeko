import { Card, Flex, Group, Space, Text } from "@mantine/core";
import { IDBGraph } from "../../../app/database/models/ideas";
import { useGraph } from "../../contexts/GraphContext";
import { IGraph, INode } from "../../declarations/graph";
import { formatDate } from "../../utils/formatting";
import { useAuth } from "../../contexts/AuthContext";
import { getCurrentTimeOfDay, getTimeOfDay } from "../../utils/datetime";

type GraphNavigationProps = {
  graph: IGraph | null;
  reloadGraph: () => Promise<void>;
  flags?: IDBGraph["flags"];
};

export const GraphNavigation = ({
  graph,
  reloadGraph,
  flags,
}: GraphNavigationProps) => {
  const { nodes, edges } = graph || { nodes: [], edges: [] };
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

  const getNodeDescription = (node: INode) => {
    if (node.type === "idea") {
      return (
        node.derived?.generative_summary?.sentenceOverview ??
        "No summary available"
      );
    }
    if (node.type === "file") {
      return node.mimeType;
    }
    if (node.type === "derived") {
      return node.type;
    }
  };

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const currentNode = selectedNode ? nodeMap.get(selectedNode) : null;

  const defaultText = () => {
    return `You currently have ${nodes.length} node${nodes.length === 1 ? "" : "s"} and ${edges.length} connection${edges.length === 1 ? "" : "s"} between them.`;
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
          <>
            <Text size="xs" c="dimmed" mt="xs">
              SELECTED
            </Text>
            <Card radius="md" withBorder shadow="xs" p="md" w="100%">
              <Flex direction="column">
                <Text fw="bold">{getNodeTitle(currentNode)}</Text>
                <Text fw="normal" size="xs" c="dimmed" mb="md">
                  {getNodeSubtitle(currentNode)}
                </Text>
                <Text>{getNodeDescription(currentNode)}</Text>
              </Flex>
            </Card>
          </>
        )}
      </Group>
    </div>
  );
};
