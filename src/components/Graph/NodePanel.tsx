// --- NodePanel.tsx ---
import React, { forwardRef } from "react"; // Import forwardRef
import { ActionIcon, Grid, Group, Text /* Title */ } from "@mantine/core"; // Title not used?
import { IDerivedNode, INode } from "../../declarations/graph";
import styles from "./NodePanel.module.scss";
import { ArrowRight, X } from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router";

export type NodePanelProps = {
  node: INode | IDerivedNode;
  position: { x: number; y: number };
  onClose: () => void;
};

// Wrap the component definition in forwardRef
const NodePanel = forwardRef<HTMLDivElement, NodePanelProps>(
  ({ node, position, onClose }, ref) => {
    // Add ref to the destructured props
    const navigate = useNavigate(); // Ensure this hook works here

    return (
      <div
        ref={ref} // <-- Assign the forwarded ref to the root div
        style={{
          position: "absolute",
          left: position.x + 4,
          top: position.y + 4,
          zIndex: 10, // Optional: Ensure panel is visually on top
        }}
        className={styles.nodePanel}
        // This helps, but the main fix is checking the ref in the container's handlers
        onClickCapture={(e) => {
          e.stopPropagation();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <Grid gutter="sm">
          <Grid.Col span={{ sm: 12 }}>
            <Group>
              {/* <ActionIcon variant="subtle" c="gray" onClick={onClose}>
                <X weight="bold" />
              </ActionIcon> */}
              <Link to={`/${node.type}/${node.id}`}>
                <ActionIcon variant="default" size="md">
                  <ArrowRight weight="bold" />
                </ActionIcon>
              </Link>
            </Group>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Text>{"title" in node ? node.title : node.id.toString()}</Text>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Text c="dimmed" size="sm">
              {"derived" in node &&
              node.derived?.generative_summary?.abstractSummary
                ? node.derived.generative_summary.abstractSummary
                : ""}
            </Text>
          </Grid.Col>
        </Grid>
      </div>
    );
  },
);

// Set display name for React DevTools
NodePanel.displayName = "NodePanel";

export default NodePanel;
