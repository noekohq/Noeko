import React from "react";
import { IDerivedNode, IEdge, INode } from "@/declarations/graph.d"; // Adjust path as needed
import styles from "./Edge.module.scss"; // Assuming styles remain similar
import { useGraph } from "@domains/constellation/contexts/GraphContext";

type EdgeProps = {
  edge: IEdge;
  sourceNode: INode | IDerivedNode | undefined;
  targetNode: INode | IDerivedNode | undefined;
};

const EdgeComponent = ({ edge, sourceNode, targetNode }: EdgeProps) => {
  const {
    selected: { get: selected },
  } = useGraph();

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

  const isSelected =
    selected.has(sourceNode.id.toString()) || selected.has(targetNode.id.toString());
  const notSelected = !isSelected && selected.size > 0;

  const strokeWidth = 1.5;

  const visibilityToStyle: Record<IEdge["visibility"], { opacity: number; strokeWidth?: number }> =
    isSelected
      ? {
          high: { opacity: 0.85 },
          medium: { opacity: 0.72 },
          low: { opacity: 0.6, strokeWidth: 1 },
        }
      : {
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

const areEqual = (prevProps: EdgeProps, nextProps: EdgeProps) => {
  // If edge visibility changes, re-render
  if (prevProps.edge.visibility !== nextProps.edge.visibility) {
    return false;
  }

  // If source/target nodes are added or removed, re-render
  if (
    (!prevProps.sourceNode && nextProps.sourceNode) ||
    (prevProps.sourceNode && !nextProps.sourceNode) ||
    (!prevProps.targetNode && nextProps.targetNode) ||
    (prevProps.targetNode && !nextProps.targetNode)
  ) {
    return false;
  }

  // If nodes are defined, check their relevant properties
  if (prevProps.sourceNode && nextProps.sourceNode) {
    if (
      prevProps.sourceNode.id !== nextProps.sourceNode.id ||
      prevProps.sourceNode.x !== nextProps.sourceNode.x ||
      prevProps.sourceNode.y !== nextProps.sourceNode.y
    ) {
      return false;
    }
  }

  if (prevProps.targetNode && nextProps.targetNode) {
    if (
      prevProps.targetNode.id !== nextProps.targetNode.id ||
      prevProps.targetNode.x !== nextProps.targetNode.x ||
      prevProps.targetNode.y !== nextProps.targetNode.y
    ) {
      return false;
    }
  }

  return true; // Props are equal
};

const Edge = React.memo(EdgeComponent, areEqual);
Edge.displayName = "Edge";

export default Edge;
