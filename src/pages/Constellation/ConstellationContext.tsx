import {
  ActionIcon,
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
import styles from "./ConstellationContext.module.scss";
import { LassoIcon, XIcon } from "@phosphor-icons/react";

type ConstellationContextProps = {
  graph: IGraph | null;
  reloadGraph: () => Promise<void>;
};

export default function ConstellationContext({
  graph,
  reloadGraph,
}: ConstellationContextProps) {
  const { nodes, edges } = graph || { nodes: [], edges: [] };
  const {
    selected: { get: selected, clear: clearSelected, remove: removeSelected },
  } = useGraph();

  const { user } = useAuth();

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const selectedNodes = nodes.filter((node) => {
    return selected.has(node.id.toString());
  });

  const defaultText = () => {
    return `You currently have ${nodes.length} node${nodes.length === 1 ? "" : "s"} and ${edges.length} connection${edges.length === 1 ? "" : "s"} between them.`;
  };

  const statusText = () => {
    let text = "";
    return text || defaultText();
  };

  return (
    <div className={styles.constellationContext}>
      <Stack justify="end">
        <Text c="dimmed" size="sm">
          {statusText()}
        </Text>
      </Stack>
      <Space h="md" />
      <Group>
        {selectedNodes.length && (
          <>
            <Group align="center" justify="space-between" w="100%">
              <Text size="sm" c="dark.4" fw="bold">
                <Group gap="xs">
                  <LassoIcon weight="bold" />
                  SELECTED
                </Group>
              </Text>
              <ActionIcon
                variant="light"
                color="gray"
                size={"sm"}
                radius="md"
                onClick={() => {
                  clearSelected();
                }}
                title="Clear selection"
              >
                <XIcon size={14} />
              </ActionIcon>
            </Group>

            {selectedNodes.map((node) => {
              return (
                <Card radius="lg" withBorder shadow="xs" p="xs" w="100%">
                  <Stack gap="md">
                    <Group justify="space-between" align="center" wrap="nowrap">
                      <Text fw="bold" size="sm">
                        {getNodeTitle(node)}
                      </Text>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size={"sm"}
                        onClick={() => {
                          removeSelected(node.id.toString());
                        }}
                        title="Unselect this item"
                      >
                        <XIcon radius={14} />
                      </ActionIcon>
                    </Group>
                    <Text size="sm">{getNodeDescription(node)}</Text>
                  </Stack>
                </Card>
              );
            })}
          </>
        )}
      </Group>
    </div>
  );
}
