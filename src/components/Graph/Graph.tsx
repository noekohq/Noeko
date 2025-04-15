import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  IDerivedNode,
  IGraph,
  IIdeaNode,
  INode,
} from "../../declarations/graph"; // Adjust path as needed
import Node from "./Node";
import Edge from "./Edge";
import DerivedNode from "./DerivedNode";
import styles from "./Graph.module.scss";
import { Flex, Text } from "@mantine/core"; // Assuming you still use Mantine
import NodePanel, { NodePanelProps } from "./NodePanel";
import FileNode from "./FileNode";

// --- Simulation Configuration ---
const SIMULATION_CONFIG = {
  forceStrength: -500,
  linkStrength: 0.7,
  centerForceStrength: 0.05,
  alpha: 1,
  alphaDecay: 0.0228,
  alphaMin: 0.001,
  velocityDecay: 0.6,
};

function getVector(
  p1: { x?: number; y?: number },
  p2: { x?: number; y?: number },
) {
  if (
    p1.x === undefined ||
    p1.y === undefined ||
    p2.x === undefined ||
    p2.y === undefined
  ) {
    return { dx: 0, dy: 0, dist: 0 };
  }
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return { dx, dy, dist };
}

type GraphContainerProps = {
  graph: IGraph;
  width?: number;
  height?: number;
  onNodeNavigate?: (event: React.MouseEvent<SVGGElement>, node: INode) => void;
  onNodeSelect?: (event: React.MouseEvent<SVGGElement>, node: INode) => void;
};

const GraphContainer: React.FC<GraphContainerProps> = ({
  graph,
  width: propWidth,
  height: propHeight,
  onNodeNavigate,
  onNodeSelect,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const [nodes, setNodes] = useState<INode[]>([]);
  const alphaRef = useRef(SIMULATION_CONFIG.alpha);
  const simulationRef = useRef<number | null>(null); // requestAnimationFrame ID

  const [isDraggingNode, setIsDraggingNode] = useState<string | null>(null);
  const dragStartPosRef = useRef<{
    x: number;
    y: number;
    nodeStartX: number;
    nodeStartY: number;
  } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartPosRef = useRef<{
    x: number;
    y: number;
    vbX: number;
    vbY: number;
  } | null>(null);
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, []);

  const runSimulationTick = useCallback(() => {
    const currentWidth = propWidth ?? dimensions.width;
    const currentHeight = propHeight ?? dimensions.height;
    if (currentWidth === 0 || currentHeight === 0) {
      simulationRef.current = null; // Stop the loop
      return;
    }

    const centerX = currentWidth / 2;
    const centerY = currentHeight / 2;

    setNodes((currentNodes) => {
      if (currentNodes.length === 0) {
        simulationRef.current = null; // Stop the loop
        return [];
      }

      let newNodes = currentNodes.map((n) => ({ ...n }));

      for (let i = 0; i < newNodes.length; i++) {
        const nodeA = newNodes[i];
        const nodeAx = nodeA.x ?? 0;
        const nodeAy = nodeA.y ?? 0;

        for (let j = i + 1; j < newNodes.length; j++) {
          const nodeB = newNodes[j];
          const nodeBx = nodeB.x ?? 0;
          const nodeBy = nodeB.y ?? 0;

          const { dx, dy, dist } = getVector(
            { x: nodeAx, y: nodeAy },
            { x: nodeBx, y: nodeBy },
          );

          if (dist > 0) {
            const force =
              (SIMULATION_CONFIG.forceStrength * alphaRef.current) /
              (dist * dist);
            const forceX = dx * force;
            const forceY = dy * force;

            if (!nodeA.fx) {
              nodeA.vx = (nodeA.vx ?? 0) + forceX;
              nodeA.vy = (nodeA.vy ?? 0) + forceY;
            }
            if (!nodeB.fx) {
              nodeB.vx = (nodeB.vx ?? 0) - forceX;
              nodeB.vy = (nodeB.vy ?? 0) - forceY;
            }
          }
        }

        if (!nodeA.fx) {
          const dxCenter = centerX - nodeAx;
          const dyCenter = centerY - nodeAy;
          nodeA.vx =
            (nodeA.vx ?? 0) +
            dxCenter * SIMULATION_CONFIG.centerForceStrength * alphaRef.current;
          nodeA.vy =
            (nodeA.vy ?? 0) +
            dyCenter * SIMULATION_CONFIG.centerForceStrength * alphaRef.current;
        }
      }

      for (const edge of graph.edges) {
        const sourceNode = newNodes.find((n) => n.id === edge.source);
        const targetNode = newNodes.find((n) => n.id === edge.target);

        if (sourceNode && targetNode) {
          const { dx, dy, dist } = getVector(sourceNode, targetNode);

          if (dist > 0) {
            const diff = dist - edge.distance;
            const edgeStrengthMultiplier = edge.strength ?? 1.0;
            const effectiveLinkStrength =
              SIMULATION_CONFIG.linkStrength * edgeStrengthMultiplier;

            const force =
              (diff * effectiveLinkStrength * alphaRef.current) / dist; // Use effective strength
            const forceX = dx * force;
            const forceY = dy * force;

            if (!sourceNode.fx) {
              sourceNode.vx = (sourceNode.vx ?? 0) + forceX;
              sourceNode.vy = (sourceNode.vy ?? 0) + forceY;
            }
            if (!targetNode.fx) {
              targetNode.vx = (targetNode.vx ?? 0) - forceX;
              targetNode.vy = (targetNode.vy ?? 0) - forceY;
            }
          }
        }
      }

      newNodes = newNodes.map((node) => {
        if (node.fx !== null && node.fy !== null) {
          return { ...node, x: node.fx, y: node.fy, vx: 0, vy: 0 };
        }

        const vx = (node.vx ?? 0) * SIMULATION_CONFIG.velocityDecay;
        const vy = (node.vy ?? 0) * SIMULATION_CONFIG.velocityDecay;
        const x = (node.x ?? 0) + vx;
        const y = (node.y ?? 0) + vy;

        return { ...node, x, y, vx, vy };
      });

      return newNodes;
    });

    alphaRef.current *= 1 - SIMULATION_CONFIG.alphaDecay;

    if (alphaRef.current < SIMULATION_CONFIG.alphaMin) {
      alphaRef.current = 0;
      simulationRef.current = null;
    } else {
      simulationRef.current = requestAnimationFrame(runSimulationTick);
    }
  }, [graph.edges, dimensions, propWidth, propHeight]);

  useEffect(() => {
    const currentWidth = propWidth ?? dimensions.width;
    const currentHeight = propHeight ?? dimensions.height;

    if (currentWidth === 0 || currentHeight === 0) return;

    const initializedNodes = graph.nodes.map((node) => ({
      ...node,
      x: node.x ?? currentWidth / 2 + (Math.random() - 0.5) * 50,
      y: node.y ?? currentHeight / 2 + (Math.random() - 0.5) * 50,
      vx: node.vx ?? 0,
      vy: node.vy ?? 0,
      fx: node.fx !== undefined ? node.fx : null,
      fy: node.fy !== undefined ? node.fy : null,
    })) as INode[];
    setNodes([...initializedNodes]);

    alphaRef.current = SIMULATION_CONFIG.alpha;
    setTransform({ k: 1, x: 0, y: 0 });

    if (simulationRef.current === null && initializedNodes.length > 0) {
      simulationRef.current = requestAnimationFrame(runSimulationTick);
    } else {
    }

    return () => {
      if (simulationRef.current) {
        cancelAnimationFrame(simulationRef.current);
      }
      simulationRef.current = null;
    };
  }, [graph.nodes, dimensions, propWidth, propHeight, runSimulationTick]);

  const getSVGPoint = useCallback(
    (screenX: number, screenY: number): { x: number; y: number } => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const svg = svgRef.current;
      const pt = svg.createSVGPoint();
      pt.x = screenX;
      pt.y = screenY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      const svgPoint = pt.matrixTransform(ctm.inverse());
      return {
        x: (svgPoint.x - transform.x) / transform.k,
        y: (svgPoint.y - transform.y) / transform.k,
      };
    },
    [transform],
  );

  const handleNodeDragStart = useCallback(
    (event: React.MouseEvent<SVGGElement>, nodeId: string) => {
      event.stopPropagation();
      setIsDraggingNode(nodeId);
      const { x, y } = getSVGPoint(event.clientX, event.clientY);

      setNodes((prevNodes) =>
        prevNodes.map((n) => {
          if (n.id === nodeId) {
            dragStartPosRef.current = {
              x,
              y,
              nodeStartX: n.x ?? 0,
              nodeStartY: n.y ?? 0,
            };
            return { ...n, fx: n.x, fy: n.y };
          }
          return n;
        }),
      );
      alphaRef.current = Math.max(alphaRef.current, 0.1);
      if (simulationRef.current === null) {
        simulationRef.current = requestAnimationFrame(runSimulationTick);
      }
    },
    [getSVGPoint, runSimulationTick],
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (isDraggingNode && dragStartPosRef.current) {
        const { x, y } = getSVGPoint(event.clientX, event.clientY);
        const newFx =
          dragStartPosRef.current.nodeStartX + (x - dragStartPosRef.current.x);
        const newFy =
          dragStartPosRef.current.nodeStartY + (y - dragStartPosRef.current.y);

        setNodes((prevNodes) =>
          prevNodes.map((n) =>
            n.id === isDraggingNode ? { ...n, fx: newFx, fy: newFy } : n,
          ),
        );
        alphaRef.current = Math.max(alphaRef.current, 0.1);
        if (simulationRef.current === null) {
          simulationRef.current = requestAnimationFrame(runSimulationTick);
        }
      } else if (isPanning && panStartPosRef.current) {
        const dx = event.clientX - panStartPosRef.current.x;
        const dy = event.clientY - panStartPosRef.current.y;
        const newTx = panStartPosRef.current.vbX + dx;
        const newTy = panStartPosRef.current.vbY + dy;
        setTransform((prev) => ({ ...prev, x: newTx, y: newTy }));
      }
    },
    [isDraggingNode, getSVGPoint, isPanning, runSimulationTick],
  );

  const handleMouseUp = useCallback(
    (event: MouseEvent) => {
      if (isDraggingNode) {
        setNodes((prevNodes) =>
          prevNodes.map((n) => {
            if (n.id === isDraggingNode) {
              return { ...n, fx: null, fy: null };
            }
            return n;
          }),
        );
        setIsDraggingNode(null);
        dragStartPosRef.current = null;
      }
      if (isPanning) {
        setIsPanning(false);
        panStartPosRef.current = null;
      }
    },
    [isDraggingNode, isPanning],
  );

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handlePanStart = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!isDraggingNode) {
      setIsPanning(true);
      panStartPosRef.current = {
        x: event.clientX,
        y: event.clientY,
        vbX: transform.x,
        vbY: transform.y,
      };
    }
  };

  const handleWheel = useCallback(
    (event: React.WheelEvent<SVGSVGElement>) => {
      // event.preventDefault();
      const scaleFactor = 1.7;
      const zoomSpeed = 0.1;
      const delta = -event.deltaY * (zoomSpeed / 100);

      const currentScale = transform.k;
      const newScaleUnclamped = currentScale * Math.pow(scaleFactor, delta);
      const minScale = 0.1;
      const maxScale = 8;
      const newScale = Math.max(
        minScale,
        Math.min(maxScale, newScaleUnclamped),
      );

      if (newScale === currentScale) return;

      const { x: mouseX, y: mouseY } = getSVGPoint(
        event.clientX,
        event.clientY,
      );

      const newTx = transform.x + (mouseX * currentScale - mouseX * newScale);
      const newTy = transform.y + (mouseY * currentScale - mouseY * newScale);

      setTransform({ k: newScale, x: newTx, y: newTy });
    },
    [transform, getSVGPoint],
  );

  const currentWidth = propWidth ?? dimensions.width;
  const currentHeight = propHeight ?? dimensions.height;
  const nodeMap = React.useMemo(() => {
    return nodes.reduce(
      (acc, node) => {
        acc[node.id.toString()] = node;
        return acc;
      },
      {} as { [key: string]: INode | IDerivedNode },
    );
  }, [nodes]);

  const [nodePanel, setNodePanel] = useState<NodePanelProps | null>(null);

  const handleNodeContextMenu = (
    event: React.MouseEvent<SVGGElement>,
    node: INode | IDerivedNode,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setNodePanel({
      node,
      position: { x: event.clientX || 0, y: event.clientY || 0 },
    });
  };

  const handleBackgroundClick = () => {
    setNodePanel(null);
  };

  console.log("Graph edges: ", graph.edges);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", overflow: "hidden" }}
      className={styles.container}
      onClick={handleBackgroundClick}
    >
      {nodePanel && <NodePanel {...nodePanel} />}
      {currentWidth > 0 && currentHeight > 0 && nodes.length ? (
        <svg
          ref={svgRef}
          width={currentWidth}
          height={currentHeight}
          onWheel={handleWheel}
          onMouseDown={handlePanStart}
          style={{ cursor: isPanning ? "grabbing" : "grab" }}
        >
          <g
            className="everything"
            transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}
          >
            {graph.edges.map((edge) => (
              <Edge
                key={`${edge.source}-${edge.target}`}
                edge={edge}
                sourceNode={nodeMap[edge.source]}
                targetNode={nodeMap[edge.target]}
              />
            ))}
            {nodes.map((node) => {
              switch (node.type) {
                case "idea":
                  return (
                    <Node
                      key={node.id.toString()}
                      node={node}
                      isDragging={isDraggingNode === node.id}
                      onNodeSelect={onNodeSelect}
                      onNodeNavigate={onNodeNavigate}
                      onDragStart={handleNodeDragStart}
                      onContextMenu={(event, node) => {
                        handleNodeContextMenu(event, node);
                      }}
                    />
                  );
                case "derived":
                  return (
                    <DerivedNode
                      key={node.id.toString()}
                      node={node}
                      isDragging={isDraggingNode === node.id.toString()}
                      onDragStart={handleNodeDragStart}
                    />
                  );
                case "file":
                  return (
                    <FileNode
                      key={node.id.toString()}
                      node={node}
                      onNodeSelect={onNodeSelect}
                      onNodeNavigate={onNodeNavigate}
                      onDragStart={handleNodeDragStart}
                      isDragging={isDraggingNode === node.id.toString()}
                    />
                  );
                default:
                  return null;
              }
            })}
          </g>
        </svg>
      ) : (
        <Flex align="center" justify="center" style={{ height: "100%" }}>
          <Text>No data yet...</Text>
        </Flex>
      )}
    </div>
  );
};

export default GraphContainer;
