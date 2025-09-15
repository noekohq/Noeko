import React from "react";
import { IDerivedNode, IEdge, INode } from "../../declarations/graph.d"; // Adjust path as needed
import styles from "./Edge.module.scss"; // Assuming styles remain similar
import { useGraph } from "../../contexts/GraphContext";

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

  const {
    selected: { get: selected },
  } = useGraph();

  const isSelected =
    selected.has(sourceNode.id.toString()) ||
    selected.has(targetNode.id.toString());
  const notSelected = !isSelected && selected.size > 0;

  const strokeWidth = 1.5;

  const visibilityToStyle: Record<
    IEdge["visibility"],
    { opacity: number; strokeWidth?: number }
  > = {
    high: { opacity: 0.5 },
    medium: { opacity: 0.35 },
    low: { opacity: 0.25, strokeWidth: 1 },
  };

  const defaultStyles = !notSelected;

  const classes = [
    isSelected ? styles.selected : "",
    notSelected ? styles.notSelected : "",
    styles.edge,
  ];

  return (
    <line
      className={classes.join(" ")}
      style={
        defaultStyles
          ? {
              ...visibilityToStyle[edge.visibility || "low"],
            }
          : {}
      }
      x1={sourceNode.x}
      y1={sourceNode.y}
      x2={targetNode.x}
      y2={targetNode.y}
      strokeWidth={strokeWidth}
    />
  );
};

export default Edge;
