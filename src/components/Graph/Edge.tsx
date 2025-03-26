// Edge.tsx
import React from "react";
import { IEdge, INode } from "../../declarations/graph.d"; // Adjust path as needed
import styles from "./Graph.module.scss"; // Assuming styles remain similar

type EdgeProps = {
  edge: IEdge;
  sourceNode: INode | undefined;
  targetNode: INode | undefined;
  strokeWidth: number;
};

const Edge = ({ edge, sourceNode, targetNode, strokeWidth }: EdgeProps) => {
  if (
    !sourceNode ||
    !targetNode ||
    sourceNode.x === undefined ||
    sourceNode.y === undefined ||
    targetNode.x === undefined ||
    targetNode.y === undefined
  ) {
    // Don't render edge if nodes or their positions aren't defined yet
    return null;
  }

  return (
    <line
      className={styles.link}
      x1={sourceNode.x}
      y1={sourceNode.y}
      x2={targetNode.x}
      y2={targetNode.y}
      stroke="var(--color-edges)"
      strokeWidth={strokeWidth}
      markerEnd="url(#arrowhead)" // Assumes arrowhead marker is defined in SVG defs
    />
  );
};

export default Edge;
