// GraphContainer.tsx (renamed from Graph.tsx for clarity)
import React, { useState, useEffect, useRef, useCallback } from "react";
import { IGraph, INode, IEdge } from "../../declarations/graph"; // Adjust path as needed
import Node from "./Node";
import Edge from "./Edge";
import styles from "./Graph.module.scss";
import { Flex, Text } from "@mantine/core"; // Assuming you still use Mantine

// --- Simulation Configuration ---
// These values are similar to your D3 setup
const SIMULATION_CONFIG = {
  forceStrength: -100, // Repulsion strength
  linkDistance: 100, // Target distance between linked nodes
  linkStrength: 0.1, // Stiffness of links (0 to 1)
  centerForceStrength: 0.05, // Strength of pull towards center
  alpha: 1, // Initial simulation intensity
  alphaDecay: 0.0228, // How quickly simulation cools down
  alphaMin: 0.001, // Threshold to stop simulation
  velocityDecay: 0.4, // Friction (0 to 1)
};

// --- Node/Edge Rendering Configuration ---
const RENDER_CONFIG = {
  nodeRadius: 24,
  nodeTextOffset: 8,
  edgeStrokeWidth: 2,
};

// --- Helper Functions ---
function getVector(
  p1: { x?: number; y?: number },
  p2: { x?: number; y?: number },
) {
  if (!p1.x || !p1.y || !p2.x || !p2.y) return { dx: 0, dy: 0, dist: 0 };
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
  const alphaRef = useRef(SIMULATION_CONFIG.alpha); // Current simulation intensity
  const simulationRef = useRef<number | null>(null); // To store requestAnimationFrame id
  const [isSimulating, setIsSimulating] = useState(true);

  // --- Interaction State ---
  const [viewBox, setViewBox] = useState("0 0 0 0");
  const [isDraggingNode, setIsDraggingNode] = useState<string | null>(null); // ID of node being dragged
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
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 }); // Scale, Translate X, Translate Y

  // --- Initialize Dimensions ---
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

  // --- Initialize Simulation Nodes ---
  useEffect(() => {
    const currentWidth = propWidth ?? dimensions.width;
    const currentHeight = propHeight ?? dimensions.height;

    if (currentWidth === 0 || currentHeight === 0) return;

    // Initialize node positions randomly near the center if they don't have positions
    const initializedNodes = graph.nodes.map((node) => ({
      ...node,
      x: node.x ?? currentWidth / 2 + (Math.random() - 0.5) * 50,
      y: node.y ?? currentHeight / 2 + (Math.random() - 0.5) * 50,
      vx: node.vx ?? 0,
      vy: node.vy ?? 0,
      fx: node.fx !== undefined ? node.fx : null, // Persist fixed positions if provided
      fy: node.fy !== undefined ? node.fy : null,
    }));
    setNodes(initializedNodes);

    // Reset simulation alpha and start
    alphaRef.current = SIMULATION_CONFIG.alpha;
    setIsSimulating(true);

    // Set initial viewBox based on dimensions
    // setViewBox(`0 0 ${currentWidth} ${currentHeight}`); // Basic viewbox
    // Initialize transform for zoom/pan
    setTransform({ k: 1, x: 0, y: 0 });

    // Cleanup function to stop simulation when graph data changes
    return () => {
      if (simulationRef.current) {
        cancelAnimationFrame(simulationRef.current);
        simulationRef.current = null;
      }
      setIsSimulating(false);
    };
  }, [graph, dimensions, propWidth, propHeight]); // Re-run if graph or dimensions change

  // --- Simulation Tick Logic ---
  const runSimulationTick = useCallback(() => {
    if (!isSimulating) return;

    const currentWidth = propWidth ?? dimensions.width;
    const currentHeight = propHeight ?? dimensions.height;
    const centerX = currentWidth / 2;
    const centerY = currentHeight / 2;

    let newNodes = [...nodes]; // Create a mutable copy for this tick

    // --- Apply Forces ---
    for (let i = 0; i < newNodes.length; i++) {
      const nodeA = newNodes[i];
      if (!nodeA.x || !nodeA.y) continue; // Skip if position is somehow undefined

      // 1. Charge Force (Repulsion) - Simple N^2 implementation
      for (let j = i + 1; j < newNodes.length; j++) {
        const nodeB = newNodes[j];
        if (!nodeB.x || !nodeB.y) continue;

        const { dx, dy, dist } = getVector(nodeA, nodeB);

        if (dist > 0) {
          // Avoid division by zero
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

      // 2. Center Force (Gravitational pull towards center)
      if (!nodeA.fx) {
        const dxCenter = centerX - nodeA.x;
        const dyCenter = centerY - nodeA.y;
        nodeA.vx =
          (nodeA.vx ?? 0) +
          dxCenter * SIMULATION_CONFIG.centerForceStrength * alphaRef.current;
        nodeA.vy =
          (nodeA.vy ?? 0) +
          dyCenter * SIMULATION_CONFIG.centerForceStrength * alphaRef.current;
      }
    }

    // 3. Link Force (Springs)
    for (const edge of graph.edges) {
      const sourceNode = newNodes.find((n) => n.id === edge.source);
      const targetNode = newNodes.find((n) => n.id === edge.target);

      if (
        sourceNode &&
        targetNode &&
        sourceNode.x &&
        sourceNode.y &&
        targetNode.x &&
        targetNode.y
      ) {
        const { dx, dy, dist } = getVector(sourceNode, targetNode);

        if (dist > 0) {
          const diff = dist - SIMULATION_CONFIG.linkDistance;
          const force =
            (diff * SIMULATION_CONFIG.linkStrength * alphaRef.current) / dist; // Normalized force
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
        // Node is fixed (e.g., during drag)
        return { ...node, x: node.fx, y: node.fy, vx: 0, vy: 0 };
      }

      // Apply velocity decay (friction)
      const vx = (node.vx ?? 0) * SIMULATION_CONFIG.velocityDecay;
      const vy = (node.vy ?? 0) * SIMULATION_CONFIG.velocityDecay;

      // Update position
      const x = (node.x ?? 0) + vx;
      const y = (node.y ?? 0) + vy;

      // Optional: Boundary collision (simple clamp) - adjust as needed
      // const clampedX = Math.max(RENDER_CONFIG.nodeRadius, Math.min(currentWidth - RENDER_CONFIG.nodeRadius, x));
      // const clampedY = Math.max(RENDER_CONFIG.nodeRadius, Math.min(currentHeight - RENDER_CONFIG.nodeRadius, y));

      return { ...node, x, y, vx, vy };
    });

    // --- Update State & Alpha ---
    setNodes(newNodes);
    alphaRef.current *= 1 - SIMULATION_CONFIG.alphaDecay;

    // --- Continue or Stop Simulation ---
    if (alphaRef.current < SIMULATION_CONFIG.alphaMin) {
      alphaRef.current = 0; // Ensure it's fully stopped
      setIsSimulating(false);
      console.log("Simulation stopped.");
      simulationRef.current = null;
    } else {
      simulationRef.current = requestAnimationFrame(runSimulationTick);
    }
  }, [nodes, graph.edges, dimensions, propWidth, propHeight, isSimulating]); // Dependencies for the tick function

  // --- Start/Manage Simulation Loop ---
  useEffect(() => {
    // Start simulation if conditions are met
    if (isSimulating && nodes.length > 0 && !simulationRef.current) {
      console.log("Starting simulation...");
      simulationRef.current = requestAnimationFrame(runSimulationTick);
    }

    // Cleanup: Stop animation frame on component unmount or when simulation stops
    return () => {
      if (simulationRef.current) {
        cancelAnimationFrame(simulationRef.current);
        simulationRef.current = null;
        console.log("Simulation cancelled.");
      }
    };
  }, [isSimulating, nodes, runSimulationTick]); // Depend on isSimulating and nodes

  // --- Coordinate Transformation (Screen to SVG) ---
  const getSVGPoint = useCallback(
    (screenX: number, screenY: number): { x: number; y: number } => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const svg = svgRef.current;
      const pt = svg.createSVGPoint();
      pt.x = screenX;
      pt.y = screenY;
      const svgPoint = pt.matrixTransform(svg.getScreenCTM()?.inverse());
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
      event.stopPropagation(); // Prevent panning while dragging node
      setIsDraggingNode(nodeId);
      const { x, y } = getSVGPoint(event.clientX, event.clientY);

      setNodes((prevNodes) =>
        prevNodes.map((n) => {
          if (n.id === nodeId) {
            // Store start position relative to SVG coordinate system
            dragStartPosRef.current = {
              x,
              y,
              nodeStartX: n.x ?? 0,
              nodeStartY: n.y ?? 0,
            };
            // Fix node position and wake up simulation
            return { ...n, fx: n.x, fy: n.y };
          }
          return n;
        }),
      );
      // Restart simulation slightly if stopped
      if (alphaRef.current < SIMULATION_CONFIG.alphaMin) {
        alphaRef.current = 0.1; // Give it a small kick
        setIsSimulating(true);
      }
    },
    [getSVGPoint],
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      const currentWidth = propWidth ?? dimensions.width;
      const currentHeight = propHeight ?? dimensions.height;
      if (!currentWidth || !currentHeight) return;

      // --- Node Dragging ---
      if (isDraggingNode && dragStartPosRef.current) {
        const { x, y } = getSVGPoint(event.clientX, event.clientY);
        // Calculate the new fixed position based on drag movement
        const newFx =
          dragStartPosRef.current.nodeStartX + (x - dragStartPosRef.current.x);
        const newFy =
          dragStartPosRef.current.nodeStartY + (y - dragStartPosRef.current.y);

        setNodes((prevNodes) =>
          prevNodes.map((n) =>
            n.id === isDraggingNode ? { ...n, fx: newFx, fy: newFy } : n,
          ),
        );
        // Keep simulation active while dragging
        if (alphaRef.current < SIMULATION_CONFIG.alphaMin) {
          alphaRef.current = 0.1; // Keep it slightly warm
          setIsSimulating(true);
        }
      }
      // --- Panning ---
      else if (isPanning && panStartPosRef.current) {
        // Calculate delta in screen coordinates
        const dx = event.clientX - panStartPosRef.current.x;
        const dy = event.clientY - panStartPosRef.current.y;

        // New translate values (no scaling applied here, just translation delta)
        const newTx = panStartPosRef.current.vbX + dx;
        const newTy = panStartPosRef.current.vbY + dy;

        setTransform((prev) => ({ ...prev, x: newTx, y: newTy }));
      }
    },
    [isDraggingNode, getSVGPoint, isPanning, dimensions, propWidth, propHeight],
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
        // Optional: Reduce simulation intensity after drag
        // alphaRef.current = Math.max(alphaRef.current, 0.3); // Or some other value
      }
      // --- End Panning ---
      if (isPanning) {
        setIsPanning(false);
        panStartPosRef.current = null;
      }
    },
    [isDraggingNode, isPanning],
  );

  // --- Global Mouse Move/Up Listeners for Drag/Pan ---
  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // --- Pan Start Handler ---
  const handlePanStart = (event: React.MouseEvent<SVGSVGElement>) => {
    // Only pan if not clicking on a node (drag start handler stops propagation)
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

  // --- Zoom Handler ---
  const handleWheel = useCallback(
    (event: React.WheelEvent<SVGSVGElement>) => {
      event.preventDefault();
      const scaleFactor = 1.1;
      const zoomSpeed = 0.1; // Adjust sensitivity
      const delta = -event.deltaY * (zoomSpeed / 100); // Normalize wheel delta

      const newScale = transform.k * Math.pow(scaleFactor, delta);
      const minScale = 0.1;
      const maxScale = 8;
      const clampedScale = Math.max(minScale, Math.min(maxScale, newScale));

      // Get mouse position in SVG coordinates before zoom
      const { x: mouseX, y: mouseY } = getSVGPoint(
        event.clientX,
        event.clientY,
      );

      // Calculate new translation to keep mouse position fixed relative to zoom point
      // Formula: newTx = mouseClientX - mouseSvgX * newScale
      // We need svgPoint relative to the untransformed svg coordinate space
      // The getSVGPoint already accounts for current transform, so we use its output directly
      const newTx =
        transform.x + (mouseX * transform.k - mouseX * clampedScale);
      const newTy =
        transform.y + (mouseY * transform.k - mouseY * clampedScale);

      setTransform({ k: clampedScale, x: newTx, y: newTy });
    },
    [transform, getSVGPoint],
  );

  // --- SVG Definitions ---
  // These can be static or generated based on nodes if needed
  const renderDefs = () => {
    // Gradient options from original code
    const gradientOptions = {
      innerColor: "var(--color-nodes)",
      outerColor: "var(--color-background)",
      opacityInner: 0.8,
      opacityOuter: 0.2,
    };
    // Marker options from original code
    const markerOptions = {
      width: 10,
      height: 10,
      refX: RENDER_CONFIG.nodeRadius * 0.8 + 5, // Adjust refX based on node radius
      refY: 0,
      orient: "auto",
      fill: "var(--color-edges)",
    };

    return (
      <defs>
        {/* Arrowhead Marker */}
        <marker
          id="arrowhead"
          viewBox="0 -5 10 10"
          refX={markerOptions.refX}
          refY={markerOptions.refY}
          markerWidth={markerOptions.width}
          markerHeight={markerOptions.height}
          orient={markerOptions.orient}
        >
          <path d="M0,-2L5,0L0,2" fill={markerOptions.fill} />
        </marker>

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
  const nodeMap = React.useMemo(
    () =>
      nodes.reduce(
        (acc, node) => {
          acc[node.id] = node;
          return acc;
        },
        {} as { [key: string]: INode },
      ),
    [nodes],
  );

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", overflow: "hidden" }} // Hide SVG overflow
      className={styles.container}
    >
      {currentWidth > 0 && currentHeight > 0 ? (
        <svg
          ref={svgRef}
          width={currentWidth}
          height={currentHeight}
          //   viewBox={viewBox} // Control zoom/pan via transform instead of viewBox for easier drag coordinate math
          onWheel={handleWheel}
          onMouseDown={handlePanStart} // Use svg background for panning
          style={{ cursor: isPanning ? "grabbing" : "grab" }} // Indicate panning state
        >
          {renderDefs()}
          <g
            className="everything"
            transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}
          >
            {/* Render Edges first (under nodes) */}
            {graph.edges.map((edge) => (
              <Edge
                key={`${edge.source}-${edge.target}`}
                edge={edge}
                sourceNode={nodeMap[edge.source]}
                targetNode={nodeMap[edge.target]}
                strokeWidth={RENDER_CONFIG.edgeStrokeWidth}
              />
            ))}

            {/* Render Nodes */}
            {nodes.map((node) => (
              <Node
                key={node.id}
                node={node}
                radius={RENDER_CONFIG.nodeRadius}
                textOffset={RENDER_CONFIG.nodeTextOffset}
                isDragging={isDraggingNode === node.id}
                onNodeClick={onNodeClick}
                onNodeHover={onNodeHover}
                onNodeHoverOut={onNodeHoverOut}
                onDragStart={handleNodeDragStart}
              />
            ))}
          </g>
        </svg>
      ) : (
        <Flex align="center" justify="center" style={{ height: "100%" }}>
          {graph.nodes.length === 0 ? (
            <Text>No data available. Add some!</Text>
          ) : (
            <Text>Initializing...</Text> // Placeholder while dimensions are calculated
          )}
        </Flex>
      )}
    </div>
  );
};

export default GraphContainer;
