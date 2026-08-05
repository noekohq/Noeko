import React, { forwardRef, useEffect, useState } from "react";
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
  Loader,
} from "@mantine/core";
import { INode } from "@/declarations/graph";
import styles from "./NodePanel.module.scss";
import {
  ArrowRightIcon,
  ArrowsOutSimpleIcon,
  GraphIcon,
  SelectionIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Link } from "react-router";
import {
  getNodeContent,
  getNodeDescription,
  getNodeLink,
  getNodeTitle,
  NodeIcon,
} from "@infrastructure/graph/utils";
import Content from "@core/design/components/Layout/Content";
import { useGraph } from "@domains/constellation/contexts/GraphContext";
import { createPortal } from "react-dom";
import useFetch from "@core/hooks/useFetch";

export type NodePanelProps = {
  node: INode;
  position: { x: number; y: number };
  onClose: () => void;
  onClusterSelect: (node: INode) => void;
  onClusterDeselect: (node: INode) => void;
};

const NodePanel = forwardRef<HTMLDivElement, NodePanelProps>(
  ({ node, position, onClose, onClusterDeselect, onClusterSelect }, ref) => {
    const [expanded, setExpanded] = useState(false);

    const {
      data: nodeDetails,
      load: loadNodeDetails,
      loading: loadingNodeDetails,
    } = useFetch<never, INode>({
      url: `/graph/node/${encodeURIComponent(node.id.toString())}`,
      cancelPrevious: true,
    });

    useEffect(() => {
      if (expanded && "summary" in node && !nodeDetails) {
        loadNodeDetails();
      }
    }, [expanded, node, nodeDetails, loadNodeDetails]);

    const displayNode = nodeDetails || node;

    const title = getNodeTitle(displayNode);
    const description = getNodeDescription(displayNode);
    const content = getNodeContent(displayNode);

    const Icon = NodeIcon(displayNode);

    const {
      selected: { get: selected, add: addSelected, remove: removeSelected },
    } = useGraph();

    const isSelected = selected.has(node.id.toString());

    return createPortal(
      <div
        ref={ref}
        style={{
          left: position.x,
          top: position.y,
          zIndex: 10,
          transform: `translateX(-50%)`,
        }}
        className={styles.nodePanel}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
        }}
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
                <ActionIcon color="gray" variant="light" radius="lg" size={"md"}>
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
                {loadingNodeDetails && <Loader size="sm" color="gray" />}
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
      </div>,
      document.body
    );
  }
);

NodePanel.displayName = "NodePanel";

export default NodePanel;
