import React, { useEffect, useRef } from "react";
import { IDerivedNode, INode } from "../../declarations/graph.d";
import styles from "./DerivedNode.module.scss";
import { useGraph } from "../../contexts/GraphContext";
import { Text } from "@mantine/core";

type DerivedNodeProps = {
  node: IDerivedNode;
  isDragging: boolean;
};

const DerivedNode = ({ node, isDragging }: DerivedNodeProps) => {
  const gradientId = `gradient-${node.id}`;

  const {
    selected: { set: setSelected, get: selectedNode },
    filter: { get: getFilter },
    loading: { get: isLoading },
  } = useGraph();

  const iAmSelected = selectedNode() === node.id.toString();
  const iAmUnselected = !iAmSelected && selectedNode();
  const iAmLoading = isLoading();
  const { filter } = getFilter();

  const handleNodeNavigate = (event: React.MouseEvent<SVGGElement>) => {
    setSelected(null);
  };

  const shouldShow = filter(node);

  const radius = 10;

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

  const randomDelay = () => {
    return Math.floor(Math.random() * 1400);
  };

  const circleRef = useRef<SVGCircleElement>(null);

  const getCoordinateBasedDelay = () => {
    // delay gets higher on a top left to bottom right gradient
    if (!node || !node.x || !node.y) return 0;
    const x = node.x;
    const y = node.y;
    const delay = Math.sqrt(x * x + y * y) * 10;
    return delay;
  };

  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.style.animationDelay = `${getCoordinateBasedDelay()}ms`;
    }
  }, []);

  const idToTitle = (id: string) => {
    const parts = id.split(":");
    const table = parts[0];
    if (table === "generative_summary") {
      return "Summary";
    }
    return table;
  };

  return (
    <g
      transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`}
      onMouseDown={handleMouseDown}
      onClick={handleNodeNavigate}
      className={`${styles.node} ${iAmSelected ? styles.selected : ""} ${iAmUnselected ? styles.unselected : ""} ${!shouldShow ? styles.hidden : ""} ${iAmLoading ? styles.loading : ""}`}
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
          <Text className={styles.nodeText} size="sm" ta="center">
            {idToTitle(node.id.toString())}
          </Text>
        </foreignObject>
      )}
    </g>
  );
};

export default DerivedNode;
