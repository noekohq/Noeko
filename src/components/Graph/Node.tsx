import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { IIdeaNode, INode } from "../../declarations/graph.d";
import styles from "./Node.module.scss";
import { useGraph } from "../../contexts/GraphContext";
import { Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { getNodeTitle, NodeIcon } from "../../utils/graph";

type NodeProps = {
  node: INode;
  isDragging: boolean;
  scaleFactor: number;
  onNodeNavigate?: (
    event: React.MouseEvent<SVGGElement> | React.TouchEvent<SVGGElement>,
    node: INode,
  ) => void;
  onNodeSelect?: (
    event: React.MouseEvent<SVGGElement> | React.TouchEvent<SVGGElement>,
    node: INode,
  ) => void;
  onContextMenu: (
    event: React.MouseEvent<SVGGElement> | React.TouchEvent<SVGGElement>,
    node: INode,
  ) => void;
  onClusterSelect: (
    event: React.MouseEvent<SVGElement> | React.TouchEvent<SVGElement>,
    node: INode,
  ) => void;
  onClusterDeselect: (
    event: React.MouseEvent<SVGElement> | React.TouchEvent<SVGElement>,
    node: INode,
  ) => void;
  "data-node-id": string;
};

const NodeComponent = ({
  node,
  isDragging,
  onNodeNavigate,
  onNodeSelect,
  onContextMenu,
  onClusterSelect,
  onClusterDeselect,
  scaleFactor,
  "data-node-id": dataNodeId,
}: NodeProps) => {
  // Refs
  const pressTimerRef = useRef<number | null>(null);
  const longPressTriggered = useRef<boolean>(false);
  const textRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<SVGCircleElement>(null);

  // State
  const [textDimensions, setTextDimensions] = useState({ width: 0, height: 0 });

  // Contexts and Hooks
  const {
    selected: {
      get: selected,
      add: addToSelection,
      remove: removeFromSelection,
    },
    highlighted: { get: highlighted },
    filter: { get: getFilter },
    loading: { get: isLoading },
    query: { get: getQuery },
  } = useGraph();
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Derived State & Values
  const nodeTitle = getNodeTitle(node);
  const iAmSelected = selected.has(node.id.toString());
  const iAmUnselected = !iAmSelected && selected.size > 0;
  const iAmHighlighted = highlighted.has(node.id.toString());
  const iAmUnHighlighted = !iAmHighlighted && highlighted.size > 0;
  const iAmLoading = isLoading();
  const { filter } = getFilter();
  const isZoomedIn = scaleFactor > 0.45;
  const shouldShow = filter(node.id.toString());
  const showText = isZoomedIn && (iAmHighlighted || !iAmUnselected);

  // Effects
  useLayoutEffect(() => {
    if (textRef.current) {
      const { scrollWidth, scrollHeight } = textRef.current;
      const padding = 4;
      setTextDimensions({
        width: scrollWidth + padding,
        height: scrollHeight + padding,
      });
    }
  }, [nodeTitle]);

  useEffect(() => {
    if (circleRef.current) {
      const randomDelay = Math.floor(Math.random() * 400);
      circleRef.current.style.animationDelay = `${randomDelay}ms`;
    }

    return () => {
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
      }
    };
  }, []);

  const handleToggleSelectNode = (node: INode) => {
    const nodeId = node.id.toString();
    if (selected.has(nodeId)) {
      removeFromSelection(nodeId);
    } else {
      addToSelection(nodeId);
      onNodeSelect;
    }
  };

  const handleContextMenu = (
    event: React.MouseEvent<SVGGElement> | React.TouchEvent<SVGGElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    onContextMenu(event, node);
  };

  const handleNodeClick = (
    event: React.MouseEvent<SVGGElement> | React.TouchEvent<SVGGElement>,
  ) => {
    handleToggleSelectNode(node);
    if (event.shiftKey) {
      onNodeNavigate?.(event, node);
    }
  };

  const handleNodeDoubleClick = (
    event: React.MouseEvent<SVGGElement> | React.TouchEvent<SVGGElement>,
  ) => {
    if (selected.has(node.id.toString())) {
      console.log("Unselecting cluster from: ", node.id.toString());
      onClusterDeselect(event, node);
      return;
    }
    console.log("Selecting cluster from: ", node.id.toString());
    onClusterSelect(event, node);
  };

  const handlePressStart = (event: React.TouchEvent<SVGGElement>) => {
    longPressTriggered.current = false;

    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
    }

    pressTimerRef.current = window.setTimeout(() => {
      if (isMobile) {
        longPressTriggered.current = true;
        handleContextMenu(event);
      }
    }, 500);
  };

  const handlePressEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
    }
  };

  // Rendering
  const textOffset = 8;

  const nodeClasses = [
    styles.node,
    styles[node.type],
    iAmSelected && styles.selected,
    iAmUnselected && styles.unselected,
    !shouldShow && styles.hidden,
    iAmLoading && styles.loading,
    isDragging && styles.dragging,
    isZoomedIn ? styles.zoomedIn : styles.zoomedOut,
    iAmHighlighted && styles.highlighted,
    iAmUnHighlighted && styles.unhighlighted,
  ]
    .filter(Boolean)
    .join(" ");

  const glowFilterId = `glow-filter-${node.id}`;
  const mainCircleRadius = parseInt(circleRef.current?.style.r || "24", 10);

  if (iAmHighlighted) {
    console.log("Highlighted: ", nodeTitle);
  }

  return (
    <g
      data-node-id={dataNodeId}
      transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`}
      onContextMenu={handleContextMenu}
      onClick={handleNodeClick}
      onDoubleClick={handleNodeDoubleClick}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onTouchMove={handlePressEnd}
      className={nodeClasses}
    >
      {iAmHighlighted && <circle className={styles.highlightRing} />}

      <circle className={styles.mainCircle} ref={circleRef} />

      {showText && (
        <foreignObject
          width={90}
          x={-90}
          height={textDimensions.height}
          y={mainCircleRadius + textOffset}
          style={{ pointerEvents: "none", overflow: "visible" }}
        >
          <div
            ref={textRef}
            style={{
              pointerEvents: "auto",
              display: "inline-block",
              textAlign: "center",
              minWidth: "180px",
            }}
          >
            <Text
              className={styles.nodeText}
              size="xs"
              tt="capitalize"
              c={iAmSelected ? "dark.1" : "dimmed"}
            >
              {nodeTitle}
            </Text>
          </div>
        </foreignObject>
      )}
    </g>
  );
};

export default React.memo(NodeComponent);
