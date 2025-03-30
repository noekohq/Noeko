import React, { useState, useEffect, useRef, useCallback } from "react";
import { IGraph, INode, IEdge } from "../../declarations/graph"; // Adjust path as needed
import Node from "./Node";
import Edge from "./Edge";
import styles from "./Graph.module.scss";
import { Flex } from "@mantine/core"; // Assuming you still use Mantine
import NodePanel, { NodePanelProps } from "./NodePanel";

// --- Simulation Configuration ---
const SIMULATION_CONFIG = {
  forceStrength: -550,
  linkDistance: 200,
  linkStrength: 0.5,
  centerForceStrength: 0.05,
  alpha: 1,
  alphaDecay: 0.0228,
  alphaMin: 0.001,
  velocityDecay: 0.4,
};

const RENDER_CONFIG = {
  nodeRadius: 10,
};

// --- Helper Functions ---
function getVector(
  p1: { x?: number; y?: number },
  p2: { x?: number; y?: number },
) {
  // Guard against undefined positions early
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
  onNodeClick: (event: React.MouseEvent<SVGGElement>, node: INode) => void;
  onNodeHover: (event: React.MouseEvent<SVGGElement>, node: INode) => void;
  onNodeHoverOut: (event: React.MouseEvent<SVGGElement>, node: INode) => void;
};

const GraphContainer: React.FC<GraphContainerProps> = ({
  graph,
  width: propWidth,
  height: propHeight,
  onNodeClick,
  onNodeHover,
  onNodeHoverOut,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // --- Simulation State ---
  const [nodes, setNodes] = useState<INode[]>([]);
  const alphaRef = useRef(SIMULATION_CONFIG.alpha);
  const simulationRef = useRef<number | null>(null); // requestAnimationFrame ID
  // We don't strictly need isSimulating state if alphaRef manages the loop continuation
  // const [isSimulating, setIsSimulating] = useState(true);

  // --- Interaction State ---
  // Removed viewBox state as we use transform
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

  // --- Initialize Dimensions --- (Keep as is)
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

  // --- Simulation Tick Logic ---
  // Wrap simulation logic in useCallback BUT without nodes in dependency array
  // It will always use the latest nodes via the state update mechanism
  const runSimulationTick = useCallback(() => {
    const currentWidth = propWidth ?? dimensions.width;
    const currentHeight = propHeight ?? dimensions.height;
    // If dimensions aren't set yet, stop.
    if (currentWidth === 0 || currentHeight === 0) {
      simulationRef.current = null; // Stop the loop
      return;
    }

    const centerX = currentWidth / 2;
    const centerY = currentHeight / 2;

    // Use setNodes with functional update to ensure we get the latest nodes
    setNodes((currentNodes) => {
      // If no nodes, stop.
      if (currentNodes.length === 0) {
        simulationRef.current = null; // Stop the loop
        return [];
      }

      let newNodes = currentNodes.map((n) => ({ ...n })); // Create a mutable copy for this tick

      // --- Apply Forces --- (Logic remains the same)
      for (let i = 0; i < newNodes.length; i++) {
        const nodeA = newNodes[i];
        // Use optional chaining and nullish coalescing for safety
        const nodeAx = nodeA.x ?? 0;
        const nodeAy = nodeA.y ?? 0;

        // 1. Charge Force
        for (let j = i + 1; j < newNodes.length; j++) {
          const nodeB = newNodes[j];
          const nodeBx = nodeB.x ?? 0;
          const nodeBy = nodeB.y ?? 0;

          // Use safe getVector
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

        // 2. Center Force
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

      // 3. Link Force
      for (const edge of graph.edges) {
        const sourceNode = newNodes.find((n) => n.id === edge.source);
        const targetNode = newNodes.find((n) => n.id === edge.target);

        if (sourceNode && targetNode) {
          // Use safe getVector
          const { dx, dy, dist } = getVector(sourceNode, targetNode);

          if (dist > 0) {
            const diff = dist - SIMULATION_CONFIG.linkDistance;
            const force =
              (diff * SIMULATION_CONFIG.linkStrength * alphaRef.current) / dist;
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

      // --- Update Positions ---
      newNodes = newNodes.map((node) => {
        if (node.fx !== null && node.fy !== null) {
          // Node is fixed
          return { ...node, x: node.fx, y: node.fy, vx: 0, vy: 0 };
        }

        const vx = (node.vx ?? 0) * SIMULATION_CONFIG.velocityDecay;
        const vy = (node.vy ?? 0) * SIMULATION_CONFIG.velocityDecay;
        const x = (node.x ?? 0) + vx;
        const y = (node.y ?? 0) + vy;

        return { ...node, x, y, vx, vy };
      });

      return newNodes; // Return the updated nodes for setNodes
    }); // End of setNodes functional update

    // --- Update Alpha ---
    alphaRef.current *= 1 - SIMULATION_CONFIG.alphaDecay;

    // --- Continue or Stop Simulation ---
    if (alphaRef.current < SIMULATION_CONFIG.alphaMin) {
      alphaRef.current = 0; // Ensure it's fully stopped
      simulationRef.current = null; // Clear the ref, stopping the loop
    } else {
      // Schedule the *next* frame ONLY if alpha is still sufficient
      simulationRef.current = requestAnimationFrame(runSimulationTick);
    }
  }, [
    graph.edges, // Edges don't change during simulation
    dimensions,
    propWidth,
    propHeight,
    // Note: nodes is NOT in dependency array, relies on functional update
  ]);

  // --- Initialize Simulation Nodes & Start Loop ---
  useEffect(() => {
    const currentWidth = propWidth ?? dimensions.width;
    const currentHeight = propHeight ?? dimensions.height;

    if (currentWidth === 0 || currentHeight === 0) return;

    // Initialize node positions
    const initializedNodes = graph.nodes.map((node) => ({
      ...node,
      x: node.x ?? currentWidth / 2 + (Math.random() - 0.5) * 50,
      y: node.y ?? currentHeight / 2 + (Math.random() - 0.5) * 50,
      vx: node.vx ?? 0,
      vy: node.vy ?? 0,
      fx: node.fx !== undefined ? node.fx : null,
      fy: node.fy !== undefined ? node.fy : null,
    }));
    setNodes(initializedNodes);

    // Reset simulation alpha
    alphaRef.current = SIMULATION_CONFIG.alpha;
    // Reset transform
    setTransform({ k: 1, x: 0, y: 0 });

    // Start the simulation loop IF it's not already running
    if (simulationRef.current === null && initializedNodes.length > 0) {
      simulationRef.current = requestAnimationFrame(runSimulationTick);
    } else {
    }

    // Cleanup function: Stop simulation when graph data or dimensions change, or on unmount
    return () => {
      if (simulationRef.current) {
        cancelAnimationFrame(simulationRef.current);
      }
      simulationRef.current = null; // Ensure it's cleared
    };
    // runSimulationTick is stable due to useCallback dependencies
  }, [graph.nodes, dimensions, propWidth, propHeight, runSimulationTick]);

  // --- Coordinate Transformation (Screen to SVG) --- (Keep as is)
  const getSVGPoint = useCallback(
    (screenX: number, screenY: number): { x: number; y: number } => {
      // ... (implementation remains the same)
      if (!svgRef.current) return { x: 0, y: 0 };
      const svg = svgRef.current;
      const pt = svg.createSVGPoint();
      pt.x = screenX;
      pt.y = screenY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 }; // Added check for null CTM
      const svgPoint = pt.matrixTransform(ctm.inverse());
      // Apply inverse of the group transform
      return {
        x: (svgPoint.x - transform.x) / transform.k,
        y: (svgPoint.y - transform.y) / transform.k,
      };
    },
    [transform],
  );

  // --- Drag Handlers ---
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
            // Fix node position
            return { ...n, fx: n.x, fy: n.y };
          }
          return n;
        }),
      );
      // Wake up simulation
      alphaRef.current = Math.max(alphaRef.current, 0.1); // Give it a kick
      // Ensure the loop restarts if it was fully stopped
      if (simulationRef.current === null) {
        simulationRef.current = requestAnimationFrame(runSimulationTick);
      }
    },
    [getSVGPoint, runSimulationTick], // Added runSimulationTick dependency
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      // --- Node Dragging ---
      if (isDraggingNode && dragStartPosRef.current) {
        const { x, y } = getSVGPoint(event.clientX, event.clientY);
        const newFx =
          dragStartPosRef.current.nodeStartX + (x - dragStartPosRef.current.x);
        const newFy =
          dragStartPosRef.current.nodeStartY + (y - dragStartPosRef.current.y);

        // Update only the dragged node's fx/fy without triggering full simulation update here
        setNodes((prevNodes) =>
          prevNodes.map((n) =>
            n.id === isDraggingNode ? { ...n, fx: newFx, fy: newFy } : n,
          ),
        );
        // Keep simulation warm, restart if needed (handled in dragStart and tick)
        alphaRef.current = Math.max(alphaRef.current, 0.1);
        if (simulationRef.current === null) {
          // Check again in case it stopped mid-drag somehow
          simulationRef.current = requestAnimationFrame(runSimulationTick);
        }
      }
      // --- Panning ---
      else if (isPanning && panStartPosRef.current) {
        const dx = event.clientX - panStartPosRef.current.x;
        const dy = event.clientY - panStartPosRef.current.y;
        const newTx = panStartPosRef.current.vbX + dx;
        const newTy = panStartPosRef.current.vbY + dy;
        setTransform((prev) => ({ ...prev, x: newTx, y: newTy }));
      }
    },
    [isDraggingNode, getSVGPoint, isPanning, runSimulationTick], // Added runSimulationTick
  );

  const handleMouseUp = useCallback(
    (event: MouseEvent) => {
      // --- End Node Drag ---
      if (isDraggingNode) {
        setNodes((prevNodes) =>
          prevNodes.map((n) => {
            if (n.id === isDraggingNode) {
              // Unfix the node
              return { ...n, fx: null, fy: null };
            }
            return n;
          }),
        );
        setIsDraggingNode(null);
        dragStartPosRef.current = null;
        // Simulation keeps running based on alpha
      }
      // --- End Panning ---
      if (isPanning) {
        setIsPanning(false);
        panStartPosRef.current = null;
      }
    },
    [isDraggingNode, isPanning],
  );

  // --- Global Mouse Move/Up Listeners --- (Keep as is)
  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // --- Pan Start Handler --- (Keep as is)
  const handlePanStart = (event: React.MouseEvent<SVGSVGElement>) => {
    // ... (implementation remains the same)
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

  // --- Zoom Handler --- (Keep as is)
  const handleWheel = useCallback(
    (event: React.WheelEvent<SVGSVGElement>) => {
      // ... (implementation remains the same)
      event.preventDefault();
      const scaleFactor = 1.1;
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

      if (newScale === currentScale) return; // Avoid unnecessary updates if scale is clamped

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

  const renderDefs = () => {
    // Gradient options from original code
    const gradientOptions = {
      innerColor: "var(--color-nodes)",
      outerColor: "var(--color-background)",
      opacityInner: 1,
      opacityOuter: 0.2,
    };

    return (
      <defs>
        {/* Node Gradients (one per node) */}
        {nodes.map((node) => (
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
        ))}
      </defs>
    );
  };

  // --- Render ---
  const currentWidth = propWidth ?? dimensions.width;
  const currentHeight = propHeight ?? dimensions.height;
  // Memoize nodeMap only based on nodes state
  const nodeMap = React.useMemo(() => {
    return nodes.reduce(
      (acc, node) => {
        acc[node.id] = node;
        return acc;
      },
      {} as { [key: string]: INode },
    );
  }, [nodes]);

  const [nodePanel, setNodePanel] = useState<NodePanelProps | null>(null);

  const handleNodeContextMenu = (
    event: React.MouseEvent<SVGGElement>,
    node: INode,
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

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", overflow: "hidden" }}
      className={styles.container}
      onClick={handleBackgroundClick}
    >
      {nodePanel && <NodePanel {...nodePanel} />}
      {currentWidth > 0 && currentHeight > 0 ? (
        <svg
          ref={svgRef}
          width={currentWidth}
          height={currentHeight}
          onWheel={handleWheel}
          onMouseDown={handlePanStart}
          style={{ cursor: isPanning ? "grabbing" : "grab" }}
        >
          {renderDefs()}
          <g
            className="everything"
            transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}
          >
            {/* Render Edges */}
            {graph.edges.map((edge) => (
              <Edge
                key={`${edge.source}-${edge.target}`}
                edge={edge}
                sourceNode={nodeMap[edge.source]}
                targetNode={nodeMap[edge.target]}
              />
            ))}
            {/* Render Nodes */}
            {nodes.map((node) => (
              <Node
                key={node.id}
                node={node}
                isDragging={isDraggingNode === node.id}
                onNodeClick={onNodeClick}
                onNodeHover={onNodeHover}
                onNodeHoverOut={onNodeHoverOut}
                onDragStart={handleNodeDragStart}
                onContextMenu={(event, node) => {
                  handleNodeContextMenu(event, node);
                }}
              />
            ))}
          </g>
        </svg>
      ) : (
        <Flex align="center" justify="center" style={{ height: "100%" }}>
          {/* ... No data / Initializing text ... */}
        </Flex>
      )}
    </div>
  );
};

export default GraphContainer;
