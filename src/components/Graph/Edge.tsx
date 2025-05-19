import React from "react";
import { IDerivedNode, IEdge, INode } from "../../declarations/graph.d"; // Adjust path as needed
import styles from "./Edge.module.scss"; // Assuming styles remain similar

type EdgeProps = {
  edge: IEdge;
  sourceNode: INode | IDerivedNode | undefined;
  targetNode: INode | IDerivedNode | undefined;
};

const Edge = ({ edge, sourceNode, targetNode }: EdgeProps) => {
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

  const strokeWidth = 2;

  const visibilityToStyle: Record<
    IEdge["visibility"],
    { opacity: number; strokeWidth?: number }
  > = {
    high: { opacity: 0.5 },
    medium: { opacity: 0.15 },
    low: { opacity: 0.1, strokeWidth: 1 },
  };

  return (
    <line
      className={`${styles.edge}`}
      style={{
        ...visibilityToStyle[edge.visibility || "low"],
      }}
      x1={sourceNode.x}
      y1={sourceNode.y}
      x2={targetNode.x}
      y2={targetNode.y}
      strokeWidth={strokeWidth}
    />
  );
};

export default Edge;
