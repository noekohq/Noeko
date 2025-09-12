import React, { forwardRef, useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Card,
  Grid,
  Group,
  Modal,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { INode } from "../../declarations/graph";
import styles from "./NodePanel.module.scss";
import {
  ArrowRightIcon,
  ArrowsOutSimpleIcon,
  GraphIcon,
  SelectionIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router";
import {
  getNodeContent,
  getNodeDescription,
  getNodeLink,
  getNodeTitle,
  NodeIcon,
} from "../../utils/graph";
import Content from "../UI/Layout/Content";
import { useGraph } from "../../contexts/GraphContext";

export type NodePanelProps = {
  node: INode;
  position: { x: number; y: number };
  onClose: () => void;
  onClusterSelect: (node: INode) => void;
  onClusterDeselect: (node: INode) => void;
};

const NodePanel = forwardRef<HTMLDivElement, NodePanelProps>(
  ({ node, position, onClose, onClusterDeselect, onClusterSelect }, ref) => {
    const navigate = useNavigate();

    const [expanded, setExpanded] = useState(false);

    const title = getNodeTitle(node);
    const description = getNodeDescription(node);
    const content = getNodeContent(node);

    const Icon = NodeIcon(node);

    const {
      selected: { get: selected, add: addSelected, remove: removeSelected },
    } = useGraph();

    const isSelected = selected.has(node.id.toString());

    return (
      <div
        ref={ref}
        style={{
          position: "absolute",
          left: position.x + 4,
          top: position.y + 4,
          zIndex: 10,
        }}
        className={styles.nodePanel}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <Grid gutter="sm">
          <Grid.Col span={{ sm: 12 }}>
            <Group justify="space-between">
              <Group gap="xs">
                {Icon && <Icon weight="bold" size={16} />}
                <Text tt="uppercase" fw="bold" size="sm">
                  {title}
                </Text>
                <Badge size="xs" variant="outline" color="gray">
                  {node.type}
                </Badge>
              </Group>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
              >
                <XIcon />
              </ActionIcon>
            </Group>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Text size="sm">{description}</Text>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Group gap="xs">
              <Link to={getNodeLink(node) || ""}>
                <ActionIcon
                  color="gray"
                  variant="light"
                  radius="lg"
                  size={"md"}
                >
                  <ArrowRightIcon weight="bold" />
                </ActionIcon>
              </Link>
              <ActionIcon
                color="gray"
                variant="light"
                radius="lg"
                size={"md"}
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(true);
                }}
              >
                <ArrowsOutSimpleIcon weight="bold" />
              </ActionIcon>
              <ActionIcon
                color={isSelected ? "blue" : "gray"}
                variant="light"
                radius="lg"
                size={"md"}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isSelected) {
                    removeSelected(node.id.toString());
                    return;
                  }
                  addSelected(node.id.toString());
                }}
              >
                <SelectionIcon weight="bold" />
              </ActionIcon>
              <ActionIcon
                color={isSelected ? "blue" : "gray"}
                variant="light"
                radius="lg"
                size={"md"}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isSelected) {
                    onClusterDeselect(node);
                    return;
                  }
                  onClusterSelect(node);
                }}
                title="Select cluster from this node..."
              >
                <GraphIcon weight="bold" />
              </ActionIcon>
            </Group>
          </Grid.Col>
        </Grid>
        <Modal
          opened={expanded}
          onClose={() => {
            setExpanded(false);
          }}
          size="lg"
        >
          <Group justify="center">
            <Content>
              <Stack>
                <Title order={3}>{title}</Title>
                <Card radius="lg" shadow="lg" withBorder>
                  <Text size="sm">{description}</Text>
                </Card>
                {content && (
                  <Box
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <div dangerouslySetInnerHTML={{ __html: content }} />
                  </Box>
                )}
              </Stack>
            </Content>
          </Group>
        </Modal>
      </div>
    );
  },
);

NodePanel.displayName = "NodePanel";

export default NodePanel;
