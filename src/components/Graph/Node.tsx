import React from "react";
import { INode } from "../../declarations/graph.d";
import styles from "./Node.module.scss";
import { useGraph } from "../../contexts/GraphContext";
import { Text } from "@mantine/core";

type NodeProps = {
  node: INode;
  isDragging: boolean;
  onNodeNavigate?: (event: React.MouseEvent<SVGGElement>, node: INode) => void;
  onNodeSelect?: (event: React.MouseEvent<SVGGElement>, node: INode) => void;
  onNodeHover?: (event: React.MouseEvent<SVGGElement>, node: INode) => void;
  onNodeHoverOut?: (event: React.MouseEvent<SVGGElement>, node: INode) => void;
  onDragStart: (event: React.MouseEvent<SVGGElement>, nodeId: string) => void;
  onContextMenu: (event: React.MouseEvent<SVGGElement>, node: INode) => void;
};

const Node = ({
  node,
  isDragging,
  onNodeNavigate,
  onNodeSelect,
  onNodeHover,
  onNodeHoverOut,
  onDragStart,
  onContextMenu,
}: NodeProps) => {
  const gradientId = `gradient-${node.id}`;

  const {
    selected: { set: setSelected, get: selectedNode },
  } = useGraph();

  const iAmSelected = selectedNode() === node.id;

  const handleMouseDown = (event: React.MouseEvent<SVGGElement>) => {
    event.preventDefault();
    onDragStart(event, node.id);
  };

  const handleMouseEnter = (event: React.MouseEvent<SVGGElement>) => {
    onNodeHover?.(event, node);
  };

  const handleMouseLeave = (event: React.MouseEvent<SVGGElement>) => {
    onNodeHoverOut?.(event, node);
  };

  const handleContextMenu = (event: React.MouseEvent<SVGGElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onContextMenu(event, node);
  };

  const handleNodeSelect = (event: React.MouseEvent<SVGGElement>) => {
    onNodeSelect?.(event, node);
    if (iAmSelected) {
      setSelected(null);
    } else {
      setSelected(node.id);
    }
  };

  const handleNodeNavigate = (event: React.MouseEvent<SVGGElement>) => {
    onNodeNavigate?.(event, node);
  };

  const radius = 24;
  const textOffset = 0;
  const foreignObjectWidth = 124;
  const foreignObjectHeight = 100;

  const foX = -foreignObjectWidth / 2;
  const foY = radius + textOffset;

  return (
    <g
      transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`}
      onMouseDown={handleMouseDown}
      onClick={handleNodeSelect}
      onDoubleClick={handleNodeNavigate}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onContextMenu={handleContextMenu}
      className={`${styles.node} ${iAmSelected ? styles.selected : ""}`}
    >
      <circle r={radius} fill={`url(#${gradientId})`} />
      <foreignObject
        x={foX}
        y={foY}
        width={foreignObjectWidth}
        height={foreignObjectHeight}
      >
        <Text className={styles.nodeText} size="sm" ta="center">
          {node.title}
        </Text>
      </foreignObject>
    </g>
  );
};

export default Node;
