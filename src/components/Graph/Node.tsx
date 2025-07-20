import React, { useEffect, useRef } from "react";
import { IIdeaNode, INode } from "../../declarations/graph.d";
import styles from "./Node.module.scss";
import { useGraph } from "../../contexts/GraphContext";
import { Highlight, Text } from "@mantine/core";
import { ArrowRight } from "@phosphor-icons/react";
import { useMediaQuery } from "@mantine/hooks";
import { getNodeTitle } from "../../utils/graph";

type NodeProps = {
  node: INode;
  isDragging: boolean;
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
  "data-node-id": string;
};

const NodeComponent = ({
  node,
  isDragging,
  onNodeNavigate,
  onNodeSelect,
  onContextMenu,
  "data-node-id": dataNodeId,
}: NodeProps) => {
  const gradientId = `gradient-${node.id}`;

  const {
    selected: { set: setSelected, get: selectedNode },
    filter: { get: getFilter },
    loading: { get: isLoading },
    query: { get: getQuery },
  } = useGraph();

  const iAmSelected = selectedNode() === node.id.toString();
  const iAmUnselected = !iAmSelected && selectedNode();
  const iAmLoading = isLoading();
  const { filter } = getFilter();
  const query = getQuery();

  const isMobile = useMediaQuery("(max-width: 768px)");

  const handleContextMenu = (
    event: React.MouseEvent<SVGGElement> | React.TouchEvent<SVGGElement>, // Allow TouchEvent
  ) => {
    event.preventDefault();
    event.stopPropagation();
    onContextMenu(event, node);
  };

  const handleNodeClick = (
    event: React.MouseEvent<SVGGElement> | React.TouchEvent<SVGGElement>, // Allow TouchEvent
  ) => {
    if (isMobile) {
      onNodeSelect?.(event, node);
      onContextMenu?.(event, node);
      return;
    }
    if (event.shiftKey) {
      if (iAmSelected) {
        onNodeSelect?.(event, node);
        setSelected(null);
      } else {
        setSelected(node.id.toString());
      }
      return;
    }
    onNodeNavigate?.(event, node);
  };

  const radius = 24;
  const textOffset = 0;
  const textWidth = 124;
  const textHeight = 100;
  const text = {
    width: textWidth,
    height: textHeight,
    x: -textWidth / 2,
    y: radius + textOffset,
  };
  const gradientOptions = {
    innerColor: "var(--color-nodes)",
    outerColor: "var(--color-background)",
    opacityInner: 1,
    opacityOuter: 0.2,
  };
  const shouldShow = filter(node);
  const randomDelay = () => Math.floor(Math.random() * 1400);
  const circleRef = useRef<SVGCircleElement>(null);
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.style.animationDelay = `${randomDelay()}ms`;
    }
  }, []);

  return (
    <g
      data-node-id={dataNodeId}
      transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`}
      onContextMenu={handleContextMenu}
      onClick={handleNodeClick}
      className={`${styles.node} ${iAmSelected ? styles.selected : ""} ${
        iAmUnselected ? styles.unselected : ""
      } ${!shouldShow ? styles.hidden : ""} ${iAmLoading ? styles.loading : ""} ${
        isDragging ? styles.dragging : ""
      } ${styles[node.type]}`}
    >
      <defs>
        <radialGradient
          key={node.id.toString()}
          id={`gradient-${node.id}`}
          cx="50%"
          cy="50%"
          r="50%"
          fx="50%"
          fy="50%"
        >
          <stop
            offset="40%"
            stopColor={gradientOptions.innerColor}
            stopOpacity={gradientOptions.opacityInner}
          />
          <stop
            offset="100%"
            stopColor={gradientOptions.outerColor}
            stopOpacity={gradientOptions.opacityOuter}
          />
        </radialGradient>
      </defs>
      <circle r={radius} fill={`url(#${gradientId})`} ref={circleRef} />
      {shouldShow && (
        <foreignObject
          x={text.x}
          y={text.y}
          width={text.width}
          height={text.height}
        >
          <Text
            className={styles.nodeText}
            size="xs"
            ta="center"
            tt="capitalize"
            c={iAmSelected ? "dark.1" : "dimmed"}
          >
            {getNodeTitle(node)}
          </Text>
        </foreignObject>
      )}
    </g>
  );
};

export default React.memo(NodeComponent);
