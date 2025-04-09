import { ActionIcon, Grid, Group, Text, Title } from "@mantine/core";
import { INode } from "../../declarations/graph";
import styles from "./NodePanel.module.scss";
import { ArrowRight } from "@phosphor-icons/react";
import { useNavigate } from "react-router";

export type NodePanelProps = {
  node: INode;
  position: { x: number; y: number };
};

export default function NodePanel({ node, position }: NodePanelProps) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        position: "absolute",
        left: position.x + 4,
        top: position.y + 4,
      }}
      className={styles.nodePanel}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <Grid gutter="sm">
        <Grid.Col span={{ sm: 12 }}>
          <Group>
            <ActionIcon
              variant="default"
              size="md"
              onClick={() => {
                navigate(`/idea/${node.id}`);
              }}
            >
              <ArrowRight weight="bold" />
            </ActionIcon>
          </Group>
        </Grid.Col>
        <Grid.Col span={{ sm: 12 }}>
          <Text>{node.title}</Text>
        </Grid.Col>
        <Grid.Col span={{ sm: 12 }}>
          <Text c="dimmed" size="sm">
            {node.derived?.generative_summary?.abstractSummary}
          </Text>
        </Grid.Col>
      </Grid>
    </div>
  );
}
