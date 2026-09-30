import { forwardRef } from "react";
import { Text } from "@mantine/core";
import type { IGraph } from "@/declarations/graph";
import { WorkingSetActions } from "@domains/constellation/components/Sidebar/WorkingSetActions";
import { useGraph } from "@domains/constellation/contexts/GraphContext";
import { createPortal } from "react-dom";
import styles from "./GraphPanel.module.scss";

interface IGraphPanelProps {
  graph: IGraph;
  position: { x: number; y: number };
  onClose: () => void;
  onTraceSelection?: () => void;
  onMutationComplete?: () => void | Promise<unknown>;
}

export const GraphPanel = forwardRef<HTMLDivElement, IGraphPanelProps>(
  ({ graph, position, onClose, onTraceSelection, onMutationComplete }, ref) => {
    const {
      selected: { get: selected },
    } = useGraph();

    return createPortal(
      <div
        className={styles.graphPanel}
        ref={ref}
        style={{
          left: position.x + 4,
          top: position.y + 16,
          zIndex: 10,
          transform: `translateX(-50%)`,
        }}
      >
        <Text fw="bold" c="dimmed" size="xs" tt="uppercase">
          Working Set · {selected.size}
        </Text>
        {selected.size > 0 ? (
          <WorkingSetActions
            graph={graph}
            compact
            onTrace={onTraceSelection}
            onMutationComplete={onMutationComplete}
            onActionComplete={onClose}
          />
        ) : (
          <Text size="sm" c="dimmed">
            Select nodes to act on them here.
          </Text>
        )}
      </div>,
      document.body
    );
  }
);

GraphPanel.displayName = "GraphPanel";
