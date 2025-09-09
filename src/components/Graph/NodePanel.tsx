import React, { forwardRef, useState } from "react";
import {
  ActionIcon,
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
  XIcon,
} from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router";
import {
  getNodeContent,
  getNodeDescription,
  getNodeTitle,
} from "../../utils/graph";
import Content from "../UI/Layout/Content";

export type NodePanelProps = {
  node: INode;
  position: { x: number; y: number };
  onClose: () => void;
};

const NodePanel = forwardRef<HTMLDivElement, NodePanelProps>(
  ({ node, position, onClose }, ref) => {
    const navigate = useNavigate();

    const [expanded, setExpanded] = useState(false);

    const title = getNodeTitle(node);
    const description = getNodeDescription(node);
    const content = getNodeContent(node);

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
        <Grid gutter="sm">
          <Grid.Col span={{ sm: 12 }}>
            <Group justify="space-between">
              <Text tt="uppercase" fw="bold" size="sm">
                {title}
              </Text>
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
            <Group>
              <Link to={`/${node.type}/${node.id.toString()}`}>
                <ActionIcon variant="light" radius="lg" size={"lg"}>
                  <ArrowRightIcon weight="bold" />
                </ActionIcon>
              </Link>
              <ActionIcon
                variant="light"
                radius="lg"
                size={"lg"}
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(true);
                }}
              >
                <ArrowsOutSimpleIcon weight="bold" />
              </ActionIcon>
            </Group>
          </Grid.Col>
        </Grid>
      </div>
    );
  },
);

NodePanel.displayName = "NodePanel";

export default NodePanel;
