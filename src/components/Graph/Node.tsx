import React, { useEffect, useRef } from "react";
import { INode } from "../../declarations/graph.d";
import styles from "./Node.module.scss";
import { useGraph } from "../../contexts/GraphContext";
import { Text } from "@mantine/core";

type NodeProps = {
  node: INode;
  isDragging: boolean;
  onNodeNavigate?: (event: React.MouseEvent<SVGGElement>, node: INode) => void;
  onNodeSelect?: (event: React.MouseEvent<SVGGElement>, node: INode) => void;
  onDragStart: (event: React.MouseEvent<SVGGElement>, nodeId: string) => void;
  onContextMenu: (event: React.MouseEvent<SVGGElement>, node: INode) => void;
};

const Node = ({
  node,
  isDragging,
  onNodeNavigate,
  onNodeSelect,
  onDragStart,
  onContextMenu,
}: NodeProps) => {
  const gradientId = `gradient-${node.id}`;

  const {
    selected: { set: setSelected, get: selectedNode },
    filter: { get: getFilter },
    loading: { get: isLoading },
  } = useGraph();

  const iAmSelected = selectedNode() === node.id;
  const iAmUnselected = !iAmSelected && selectedNode();
  const iAmLoading = isLoading();
  const { filter } = getFilter();

  const handleMouseDown = (event: React.MouseEvent<SVGGElement>) => {
    event.preventDefault();
    onDragStart(event, node.id);
  };

  const handleContextMenu = (event: React.MouseEvent<SVGGElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onContextMenu(event, node);
  };

  const handleNodeSelect = (event: React.MouseEvent<SVGGElement>) => {
    onNodeSelect?.(event, node);
    setSelected(node.id);
  };
  const handleNodeUnselect = (event: React.MouseEvent<SVGGElement>) => {
    onNodeSelect?.(event, node);
    setSelected(null);
  };

  const handleNodeNavigate = (event: React.MouseEvent<SVGGElement>) => {
    setSelected(null);
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

  const randomDelay = () => {
    return Math.floor(Math.random() * 1400);
  };

  const circleRef = useRef<SVGCircleElement>(null);

  console.log("X Y: ", node.x, node.y);

  const getCoordinateBasedDelay = () => {
    // closer to the center, delay is shorter
    if (!node || !node.x || !node.y) return 0;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const distance = Math.sqrt(
      Math.pow(node.x - centerX, 2) + Math.pow(node.y - centerY, 2),
    );
    const maxDistance = Math.sqrt(
      Math.pow(window.innerWidth, 2) + Math.pow(window.innerHeight, 2),
    );
    const delay = Math.max(
      0,
      Math.min(1000, 1000 * (1 - distance / maxDistance)),
    );
    return delay;
  };

  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.style.animationDelay = `${randomDelay()}ms`;
    }
  }, []);

  return (
    <g
      transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleNodeSelect}
      onMouseLeave={handleNodeUnselect}
      onClick={handleNodeNavigate}
      onContextMenu={handleContextMenu}
      className={`${styles.node} ${iAmSelected ? styles.selected : ""} ${iAmUnselected ? styles.unselected : ""} ${!shouldShow ? styles.hidden : ""} ${iAmLoading ? styles.loading : ""}`}
    >
      <defs>
        <radialGradient
          key={node.id}
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
          <Text className={styles.nodeText} size="sm" ta="center">
            {node.title}
          </Text>
        </foreignObject>
      )}
    </g>
  );
};

export default Node;
