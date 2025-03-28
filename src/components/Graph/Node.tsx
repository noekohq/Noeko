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

  const radius = 24;
  const textOffset = 0;
  const foreignObjectWidth = 124; // Width for the wrapping container
  const foreignObjectHeight = 100; // Estimate needed height (can be dynamic)

  // Calculate position for foreignObject to center it below the circle
  const foX = -foreignObjectWidth / 2;
  const foY = radius + textOffset;

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
      <foreignObject
        x={foX}
        y={foY}
        width={foreignObjectWidth}
        height={foreignObjectHeight} // Needs to be large enough for wrapped text
        // Overflow can be set via CSS on the inner div if needed
      >
        {/* Required xmlns for HTML inside SVG */}
        <div className={styles.nodeText}>{node.title}</div>
      </foreignObject>
    </g>
  );
};

export default Node;
