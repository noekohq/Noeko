import {
  Button,
  Card,
  Flex,
  Group,
  HoverCard,
  Space,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { IDBGraph } from "../../../app/database/models/ideas";
import { useGraph } from "../../contexts/GraphContext";
import { IGraph } from "../../declarations/graph";
import { useAuth } from "../../contexts/AuthContext";
import {
  getNodeDescription,
  getNodeSubtitle,
  getNodeTitle,
} from "../../utils/graph";
import { Link } from "react-router";

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

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const currentNode = selectedNode ? nodeMap.get(selectedNode) : null;

  const defaultText = () => {
    return `You currently have ${nodes.length} node${nodes.length === 1 ? "" : "s"} and ${edges.length} connection${edges.length === 1 ? "" : "s"} between them.`;
  };

  const statusText = () => {
    let text = "";
    // if (flags?.embeddings && !flags.embeddings.synced) {
    //   text += "Embeddings out of sync. ";
    // }
    return text || defaultText();
  };

  return (
    <div>
      <Stack justify="end">
        {/* <HoverCard width="300px" openDelay={200}>
          <HoverCard.Target>
            <Link to="heavy">
              <Button variant="light">Enter Heavy Mode</Button>
            </Link>
          </HoverCard.Target>
          <HoverCard.Dropdown>
            <Text>
              Heavy mode is a heavily computed form of your graph, showing all
              of the relationships between your ideas.{" "}
              <strong>It takes a lot longer to load</strong>, but is arguably
              cooler.
            </Text>
          </HoverCard.Dropdown>
        </HoverCard> */}
        <Text c="dimmed" size="sm">
          {statusText()}
        </Text>
      </Stack>
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
