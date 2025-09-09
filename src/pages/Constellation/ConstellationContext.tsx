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
import styles from "./ConstellationContext.module.scss";
import {
  CompassIcon,
  LassoIcon,
  UniteSquareIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Tabs } from "../../components/UI/Layout/Utils/Tabs";
import { GraphOrganizer } from "../../components/Display/Interactions/GraphOrganizer/GraphOrganizer";

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
      <Tabs defaultValue="organize">
        <Tabs.List>
          <Tabs.Tab value="organize">
            <Group gap="xs">
              <UniteSquareIcon size={14} weight="duotone" />
              Organize
            </Group>
          </Tabs.Tab>
          <Tabs.Tab value="explore">
            <Group gap="xs">
              <CompassIcon size={14} weight="duotone" />
              Explore
            </Group>
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="organize">
          <Stack>
            <Text c="dimmed" size="sm">
              {statusText()}
            </Text>
            <GraphOrganizer nodes={nodes} />
          </Stack>
        </Tabs.Panel>
        <Tabs.Panel value="explore">
          <Text size="sm" c="dimmed">
            Exploration is coming soon...
          </Text>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
