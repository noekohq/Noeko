// Node.tsx
import React, { useRef, useEffect } from "react";
import { INode } from "../../declarations/graph.d"; // Adjust path as needed
import styles from "./Node.module.scss"; // Assuming styles remain similar

type NodeProps = {
  node: INode;
  isDragging: boolean;
  onNodeClick: (event: React.MouseEvent<SVGGElement>, node: INode) => void;
  onNodeHover: (event: React.MouseEvent<SVGGElement>, node: INode) => void;
  onNodeHoverOut: (event: React.MouseEvent<SVGGElement>, node: INode) => void;
  onDragStart: (event: React.MouseEvent<SVGGElement>, nodeId: string) => void;
};

const Node = ({
  node,
  isDragging,
  onNodeClick,
  onNodeHover,
  onNodeHoverOut,
  onDragStart,
}: NodeProps) => {
  const gradientId = `gradient-${node.id}`;

  const handleMouseDown = (event: React.MouseEvent<SVGGElement>) => {
    // Prevent browser drag behavior if needed
    // event.preventDefault();
    onDragStart(event, node.id);
  };

  // We only need onMouseDown here. onMouseMove and onMouseUp will be handled globally
  // in the parent SVG component because mouse events can leave the original element.
  //
  const radius = 24;
  const textOffset = 8;

  return (
    <g
      className={styles.node}
      transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`}
      onMouseDown={handleMouseDown}
      onClick={(e) => onNodeClick(e, node)}
      onMouseEnter={(e) => onNodeHover(e, node)}
      onMouseLeave={(e) => onNodeHoverOut(e, node)}
    >
      <circle r={radius} fill={`url(#${gradientId})`} />
      <text
        className={styles.nodeText}
        textAnchor="middle"
        dominantBaseline="hanging"
        y={radius + textOffset}
      >
        {node.title}
      </text>
    </g>
  );
};

export default Node;
