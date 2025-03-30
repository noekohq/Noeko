// Node.tsx
import React, { useRef, useEffect, useState } from "react";
import { INode } from "../../declarations/graph.d"; // Adjust path as needed
import styles from "./Node.module.scss"; // Assuming styles remain similar

type NodeProps = {
  node: INode;
  isDragging: boolean;
  onNodeClick: (event: React.MouseEvent<SVGGElement>, node: INode) => void;
  onNodeHover: (event: React.MouseEvent<SVGGElement>, node: INode) => void;
  onNodeHoverOut: (event: React.MouseEvent<SVGGElement>, node: INode) => void;
  onDragStart: (event: React.MouseEvent<SVGGElement>, nodeId: string) => void;
  onContextMenu: (event: React.MouseEvent<SVGGElement>, node: INode) => void;
};

const Node = ({
  node,
  isDragging,
  onNodeClick,
  onNodeHover,
  onNodeHoverOut,
  onDragStart,
  onContextMenu,
}: NodeProps) => {
  const gradientId = `gradient-${node.id}`;

  const handleMouseDown = (event: React.MouseEvent<SVGGElement>) => {
    // Prevent browser drag behavior if needed
    event.preventDefault();
    onDragStart(event, node.id);
  };

  const handleMouseEnter = (event: React.MouseEvent<SVGGElement>) => {
    onNodeHover(event, node);
  };

  const handleMouseLeave = (event: React.MouseEvent<SVGGElement>) => {
    onNodeHoverOut(event, node);
  };

  const handleContextMenu = (event: React.MouseEvent<SVGGElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onContextMenu(event, node);
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
      onDoubleClick={(e) => onNodeClick(e, node)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onContextMenu={handleContextMenu}
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
