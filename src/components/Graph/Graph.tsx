import React, { useState, useEffect, useRef, useCallback } from "react";
import { IDerivedNode, IEdge, IGraph, INode } from "../../declarations/graph"; // Adjust path as needed
import Node from "./Node";
import Edge from "./Edge";
import styles from "./Graph.module.scss";
import { Flex, Text } from "@mantine/core"; // Assuming you still use Mantine
import NodePanel from "./NodePanel";

// --- Simulation Configuration ---
const SIMULATION_CONFIG = {
  forceStrength: -600,
  linkStrength: 0.7,
  centerForceStrength: 0.06,
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

function getTouchDistance(touch1: React.Touch, touch2: React.Touch): number {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

// Helper to get midpoint between two touches
function getTouchMidpoint(
  touch1: React.Touch,
  touch2: React.Touch,
): { x: number; y: number } {
  return {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2,
  };
}

type GraphContainerProps = {
  graph: IGraph;
  width?: number;
  height?: number;
  onNodeNavigate?: (
    event: React.MouseEvent<SVGGElement> | React.TouchEvent<SVGGElement>,
    node: INode,
  ) => void;
  onNodeSelect?: (
    event: React.MouseEvent<SVGGElement> | React.TouchEvent<SVGGElement>,
    node: INode,
  ) => void;
  isNavigating?: boolean;
};

const GraphContainer: React.FC<GraphContainerProps> = ({
  graph,
  width: propWidth,
  height: propHeight,
  onNodeNavigate,
  onNodeSelect,
  isNavigating,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const [nodes, setNodes] = useState<INode[]>([]);
  const [edges, setEdges] = useState<IEdge[]>(graph.edges);
  const alphaRef = useRef(SIMULATION_CONFIG.alpha);
  const simulationRef = useRef<number | null>(null); // requestAnimationFrame ID

  const [isDraggingNode, setIsDraggingNode] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const pinchStartRef = useRef<{
    // For touch pinch
    distance: number;
    midpoint: { x: number; y: number };
    initialTransform: { k: number; x: number; y: number };
  } | null>(null);

  const longPressTimerRef = useRef<Timer | null>(null);
  const longPressNodeRef = useRef<INode | IDerivedNode | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null); // Track start for tap vs drag

  const nodeMap = React.useMemo(() => {
    return nodes.reduce(
      (acc, node) => {
        acc[node.id.toString()] = node;
        return acc;
      },
      {} as { [key: string]: INode | IDerivedNode },
    );
  }, [nodes]);

  // Modify existing refs to store pointerId (touch identifier or null for mouse)
  const dragStartPosRef = useRef<{
    pointerId: number | null; // <-- Add this
    screenX: number; // <-- Use screenX/Y consistently
    screenY: number;
    nodeStartX: number;
    nodeStartY: number;
  } | null>(null);

  const panStartPosRef = useRef<{
    pointerId: number | null; // <-- Add this
    screenX: number; // <-- Use screenX/Y consistently
    screenY: number;
    vbX: number;
    vbY: number;
  } | null>(null);

  const nodePanelRef = useRef<HTMLDivElement>(null); // Ref for the NodePanel div
  const [nodePanel, setNodePanel] = useState<{
    node: INode | IDerivedNode;
    position: { x: number; y: number };
    onClose: () => void;
  } | null>(null);

  // Define the function that closes the panel (if not already defined clearly)
  const handleClosePanel = useCallback(() => {
    setNodePanel(null);
  }, []);

  // Define Long Press Duration
  const LONG_PRESS_DURATION = 500; // ms
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
    if (isNavigating) {
      if (simulationRef.current) {
        cancelAnimationFrame(simulationRef.current);
      }
      simulationRef.current = null;
      alphaRef.current = 0;
      return;
    }
    const currentWidth = propWidth ?? dimensions.width;
    const currentHeight = propHeight ?? dimensions.height;
    if (currentWidth === 0 || currentHeight === 0) {
      simulationRef.current = null; // Stop the loop
      return;
    }

    const centerX = currentWidth / 2;
    const centerY = currentHeight / 2;

    // setNodes((currentNodes) => {
    //   if (currentNodes.length === 0) {
    //     simulationRef.current = null; // Stop the loop
    //     return [];
    //   }

    //   let newNodes = currentNodes.map((n) => ({ ...n }));

    //   for (let i = 0; i < newNodes.length; i++) {
    //     const nodeA = newNodes[i];
    //     const nodeAx = nodeA.x ?? 0;
    //     const nodeAy = nodeA.y ?? 0;

    //     for (let j = i + 1; j < newNodes.length; j++) {
    //       const nodeB = newNodes[j];
    //       const nodeBx = nodeB.x ?? 0;
    //       const nodeBy = nodeB.y ?? 0;

    //       const { dx, dy, dist } = getVector(
    //         { x: nodeAx, y: nodeAy },
    //         { x: nodeBx, y: nodeBy },
    //       );

    //       if (dist > 0) {
    //         const force =
    //           (SIMULATION_CONFIG.forceStrength * alphaRef.current) /
    //           (dist * dist);
    //         const forceX = dx * force;
    //         const forceY = dy * force;

    //         if (!nodeA.fx) {
    //           nodeA.vx = (nodeA.vx ?? 0) + forceX;
    //           nodeA.vy = (nodeA.vy ?? 0) + forceY;
    //         }
    //         if (!nodeB.fx) {
    //           nodeB.vx = (nodeB.vx ?? 0) - forceX;
    //           nodeB.vy = (nodeB.vy ?? 0) - forceY;
    //         }
    //       }
    //     }

    //     if (!nodeA.fx) {
    //       const dxCenter = centerX - nodeAx;
    //       const dyCenter = centerY - nodeAy;
    //       nodeA.vx =
    //         (nodeA.vx ?? 0) +
    //         dxCenter * SIMULATION_CONFIG.centerForceStrength * alphaRef.current;
    //       nodeA.vy =
    //         (nodeA.vy ?? 0) +
    //         dyCenter * SIMULATION_CONFIG.centerForceStrength * alphaRef.current;
    //     }
    //   }

    //   for (const edge of graph.edges) {
    //     const sourceNode = newNodes.find((n) => n.id === edge.source);
    //     const targetNode = newNodes.find((n) => n.id === edge.target);

    //     if (sourceNode && targetNode) {
    //       const { dx, dy, dist } = getVector(sourceNode, targetNode);

    //       if (dist > 0) {
    //         const diff = dist - edge.distance;
    //         const edgeStrengthMultiplier = edge.strength ?? 1.0;
    //         const effectiveLinkStrength =
    //           SIMULATION_CONFIG.linkStrength * edgeStrengthMultiplier;

    //         const force =
    //           (diff * effectiveLinkStrength * alphaRef.current) / dist; // Use effective strength
    //         const forceX = dx * force;
    //         const forceY = dy * force;

    //         if (!sourceNode.fx) {
    //           sourceNode.vx = (sourceNode.vx ?? 0) + forceX;
    //           sourceNode.vy = (sourceNode.vy ?? 0) + forceY;
    //         }
    //         if (!targetNode.fx) {
    //           targetNode.vx = (targetNode.vx ?? 0) - forceX;
    //           targetNode.vy = (targetNode.vy ?? 0) - forceY;
    //         }
    //       }
    //     }
    //   }

    //   newNodes = newNodes.map((node) => {
    //     if (node.fx !== null && node.fy !== null) {
    //       return { ...node, x: node.fx, y: node.fy, vx: 0, vy: 0 };
    //     }

    //     const vx = (node.vx ?? 0) * SIMULATION_CONFIG.velocityDecay;
    //     const vy = (node.vy ?? 0) * SIMULATION_CONFIG.velocityDecay;
    //     const x = (node.x ?? 0) + vx;
    //     const y = (node.y ?? 0) + vy;

    //     return { ...node, x, y, vx, vy };
    //   });

    //   return newNodes;
    // });
    setNodes((currentNodes) => {
      const currentWidth = propWidth ?? dimensions.width; // Ensure these are available
      const currentHeight = propHeight ?? dimensions.height;
      const centerX = currentWidth / 2;
      const centerY = currentHeight / 2;

      if (
        currentNodes.length === 0 ||
        currentWidth === 0 ||
        currentHeight === 0
      ) {
        simulationRef.current = null;
        return [];
      }

      // 1. Create mutable copies for simulation. Initialize/ensure essential properties.
      const simNodes = currentNodes.map((n) => ({
        ...n,
        x: n.x ?? centerX + (Math.random() - 0.5) * 0.1, // Ensure x is defined
        y: n.y ?? centerY + (Math.random() - 0.5) * 0.1, // Ensure y is defined
        vx: n.vx ?? 0,
        vy: n.vy ?? 0,
      }));

      // 2. Create a map for efficient node lookup during edge processing (CRITICAL FOR PERFORMANCE)
      const simNodeMap = new Map(simNodes.map((n) => [n.id, n]));

      // --- Repulsion Forces (Node-Node) ---
      for (let i = 0; i < simNodes.length; i++) {
        const nodeA = simNodes[i];
        // Ensure nodeA.x and nodeA.y are numbers
        const nodeAx = nodeA.x!;
        const nodeAy = nodeA.y!;

        for (let j = i + 1; j < simNodes.length; j++) {
          const nodeB = simNodes[j];
          const nodeBx = nodeB.x!;
          const nodeBy = nodeB.y!;

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
              nodeA.vx += forceX; // Mutate copy
              nodeA.vy += forceY; // Mutate copy
            }
            if (!nodeB.fx) {
              nodeB.vx -= forceX; // Mutate copy
              nodeB.vy -= forceY; // Mutate copy
            }
          }
        }

        // --- Centering Force --- (Applied to nodeA)
        if (!nodeA.fx) {
          const dxCenter = centerX - nodeAx;
          const dyCenter = centerY - nodeAy;
          nodeA.vx +=
            dxCenter * SIMULATION_CONFIG.centerForceStrength * alphaRef.current;
          nodeA.vy +=
            dyCenter * SIMULATION_CONFIG.centerForceStrength * alphaRef.current;
        }
      }

      // --- Link Forces (Edge) ---
      for (const edge of graph.edges) {
        // graph.edges is from the component's props/state
        const sourceNode = simNodeMap.get(edge.source); // O(1) lookup
        const targetNode = simNodeMap.get(edge.target); // O(1) lookup

        if (sourceNode && targetNode) {
          const { dx, dy, dist } = getVector(sourceNode, targetNode);

          if (dist > 0) {
            const diff = dist - edge.distance;
            const edgeStrengthMultiplier = edge.strength ?? 1.0;
            const effectiveLinkStrength =
              SIMULATION_CONFIG.linkStrength * edgeStrengthMultiplier;

            const force =
              (diff * effectiveLinkStrength * alphaRef.current) / dist;
            const forceX = dx * force;
            const forceY = dy * force;

            if (!sourceNode.fx) {
              sourceNode.vx += forceX; // Mutate copy
              sourceNode.vy += forceY; // Mutate copy
            }
            if (!targetNode.fx) {
              targetNode.vx -= forceX; // Mutate copy
              targetNode.vy -= forceY; // Mutate copy
            }
          }
        }
      }

      // --- Update positions based on velocities ---
      // This final map creates the new objects for React state.
      return simNodes.map((node) => {
        if (node.fx !== null && node.fy !== null) {
          // Node is fixed, ensure vx/vy are reset
          return { ...node, x: node.fx, y: node.fy, vx: 0, vy: 0 };
        }

        const newVx = node.vx * SIMULATION_CONFIG.velocityDecay;
        const newVy = node.vy * SIMULATION_CONFIG.velocityDecay;
        const newX = node.x! + newVx; // node.x is guaranteed by now
        const newY = node.y! + newVy; // node.y is guaranteed by now

        return { ...node, x: newX, y: newY, vx: newVx, vy: newVy };
      });
    });

    alphaRef.current *= 1 - SIMULATION_CONFIG.alphaDecay;

    if (alphaRef.current < SIMULATION_CONFIG.alphaMin) {
      alphaRef.current = 0;
      simulationRef.current = null;
    } else if (!isNavigating) { // Ensure not to restart if navigating
      simulationRef.current = requestAnimationFrame(runSimulationTick);
    }
  }, [edges, dimensions, propWidth, propHeight, isNavigating]);

  useEffect(() => {
    if (isNavigating) {
      if (simulationRef.current) {
        cancelAnimationFrame(simulationRef.current);
      }
      simulationRef.current = null;
      alphaRef.current = 0;
      return; // Stop if navigating
    }
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

    if (!isNavigating && simulationRef.current === null && initializedNodes.length > 0) {
      simulationRef.current = requestAnimationFrame(runSimulationTick);
    } else {
    }

    return () => {
      if (simulationRef.current) {
        cancelAnimationFrame(simulationRef.current);
      }
      simulationRef.current = null;
    };
  }, [graph.nodes, dimensions, propWidth, propHeight, runSimulationTick, isNavigating]);

  const getSVGPoint = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const svg = svgRef.current;
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      const svgPoint = pt.matrixTransform(ctm.inverse());
      return { x: svgPoint.x, y: svgPoint.y };
    },
    [], // No dependency on transform needed here
  );

  // Add this function to convert screen coordinates to coordinates within the transformed viewbox
  const screenToSVGCoords = useCallback(
    (screenX: number, screenY: number): { x: number; y: number } => {
      const { x: svgX, y: svgY } = getSVGPoint(screenX, screenY); // Use the raw SVG point
      // Apply inverse transform to get coordinates *inside* the transformed <g>
      return {
        x: (svgX - transform.x) / transform.k,
        y: (svgY - transform.y) / transform.k,
      };
    },
    [getSVGPoint, transform],
  ); // Depends on getSVGPoint and current transform

  const handleMouseDown = (event: React.MouseEvent<SVGSVGElement>) => {
    const target = event.target as SVGElement;
    // IMPORTANT: Assumes your Node/DerivedNode/FileNode components render a top-level <g data-node-id="...">
    const nodeElement = target.closest("[data-node-id]");

    if (event.button === 0) {
      // Only handle left clicks
      if (nodeElement) {
        const nodeId = nodeElement.getAttribute("data-node-id");
        if (nodeId) {
          startNodeDrag(nodeId, null, event.clientX, event.clientY); // Use null pointerId for mouse
        }
      } else {
        // Pan on background click
        startPan(null, event.clientX, event.clientY); // Use null pointerId for mouse
      }
    }
    // Prevent default potentially interfering actions
    // event.preventDefault(); // Uncomment if needed, might interfere with text selection etc.
  };

  // REVISED: handleMouseMove (Checks pointerId to distinguish mouse move)
  const handleMouseMove = (event: MouseEvent) => {
    // Only proceed if a mouse drag (pointerId null) is active
    if (isDraggingNode && dragStartPosRef.current?.pointerId === null) {
      const { x: currentSvgX, y: currentSvgY } = screenToSVGCoords(
        event.clientX,
        event.clientY,
      );
      // Use the stored offset to calculate the new fixed position (fx, fy)
      const newFx = currentSvgX + dragStartPosRef.current.nodeStartX;
      const newFy = currentSvgY + dragStartPosRef.current.nodeStartY;

      setNodes((prevNodes) =>
        prevNodes.map((n) =>
          n.id === isDraggingNode ? { ...n, fx: newFx, fy: newFy } : n,
        ),
      );
      // Keep simulation active during drag
      alphaRef.current = Math.max(alphaRef.current, 0.1);
      if (simulationRef.current === null && nodes.length > 0) {
        simulationRef.current = requestAnimationFrame(runSimulationTick);
      }
    } else if (isPanning && panStartPosRef.current?.pointerId === null) {
      // Handle mouse pan
      // Calculate delta movement from the stored start screen position
      const dx = event.clientX - panStartPosRef.current.screenX;
      const dy = event.clientY - panStartPosRef.current.screenY;
      // Apply delta to the stored initial viewbox position
      const newTx = panStartPosRef.current.vbX + dx;
      const newTy = panStartPosRef.current.vbY + dy;
      setTransform((prev) => ({ ...prev, x: newTx, y: newTy }));
    }
  };

  // --- Modify handleMouseUp ---
  const handleMouseUp = useCallback(
    (event: MouseEvent) => {
      const target = event.target as Element; // Use Element type

      // Check if the click occurred INSIDE the NodePanel using the ref
      // Make sure nodePanelRef.current exists before checking contains
      const isClickInsideNodePanel = nodePanelRef.current?.contains(target);

      // --- Existing drag/pan ending logic ---
      const wasDragging =
        !!isDraggingNode && dragStartPosRef.current?.pointerId === null;
      const wasPanning =
        !!isPanning && panStartPosRef.current?.pointerId === null;
      let dragJustEnded = false; // Separate check if drag ended *this event*

      if (wasDragging) {
        // ... (node release logic) ...
        dragJustEnded = true; // Mark drag end
        setIsDraggingNode(null);
        dragStartPosRef.current = null;
      }
      if (wasPanning) {
        setIsPanning(false);
        panStartPosRef.current = null;
      }
      // --- End of drag/pan ending logic ---

      // --- Revised Click/Tap Logic ---
      // Only process clicks if a drag didn't just end on this event
      if (!dragJustEnded && event.button === 0) {
        // Find node element within SVG context (might be null if click is outside SVG)
        const nodeElement = target.closest("g[data-node-id]"); // Check closest <g>

        if (
          nodeElement &&
          !isClickInsideNodePanel /* && onNodeSelect - Add if needed */
        ) {
          // Click was on a node, outside the panel
          const nodeId = nodeElement.getAttribute("data-node-id");
          const node = nodeMap[nodeId!];
          if (node && typeof onNodeSelect === "function") {
            // Example: Trigger selection
            // onNodeSelect(event as any, node);
          }
          if (node && typeof onNodeNavigate === "function") {
            // Example: Trigger navigation
            // onNodeNavigate(event as any, node);
          }
        } else if (
          !nodeElement &&
          !isClickInsideNodePanel &&
          typeof handleClosePanel === "function"
        ) {
          // Click was NOT on a node AND NOT inside the panel -> treat as background click
          handleClosePanel(); // Close the panel
        } else if (isClickInsideNodePanel) {
          // Click was INSIDE the panel, do nothing here.
          // Let NodePanel's internal handlers (`onClick` on buttons, `onClickCapture`) manage it.
        }
      }
      // Add dependencies based on what's used inside (isDraggingNode, isPanning, nodeMap, handleClosePanel, etc.)
    },
    [
      isDraggingNode,
      isPanning,
      handleClosePanel,
      nodeMap,
      onNodeSelect,
      onNodeNavigate,
    ],
  );

  // Ensure the useEffect for mouse listeners uses the correct handlers
  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    // Add handleMouseMove, handleMouseUp to dependency array if they aren't stable (useCallback)
  }, [handleMouseMove, handleMouseUp]);

  const handleTouchStart = (event: React.TouchEvent<SVGSVGElement>) => {
    // event.preventDefault(); // Prevent default only if absolutely needed immediately

    const touches = event.touches;

    // --- Clear any existing Long Press Timer ---
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (touches.length === 1) {
      const touch = touches[0];
      const target = event.target as SVGElement;
      const nodeElement = target.closest("[data-node-id]");

      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY }; // Store for tap vs drag check

      if (nodeElement) {
        const nodeId = nodeElement.getAttribute("data-node-id");
        const node = nodeMap[nodeId!];
        if (nodeId && node) {
          longPressNodeRef.current = node; // Store node for potential long press

          // --- Start Long Press Timer ---
          longPressTimerRef.current = setTimeout(() => {
            if (longPressNodeRef.current) {
              // Check if still relevant
              handleNodeContextMenu(event as any, longPressNodeRef.current);
              // Clear states to prevent drag/pan starting after long press
              setIsDraggingNode(null);
              dragStartPosRef.current = null;
              setIsPanning(false);
              panStartPosRef.current = null;
              longPressNodeRef.current = null; // Clear ref after firing
            }
            longPressTimerRef.current = null;
          }, LONG_PRESS_DURATION);

          // Store info needed to potentially START a drag (but don't set isDraggingNode yet)
          const { x: svgX, y: svgY } = screenToSVGCoords(
            touch.clientX,
            touch.clientY,
          );
          dragStartPosRef.current = {
            pointerId: touch.identifier,
            screenX: touch.clientX,
            screenY: touch.clientY,
            nodeStartX: (node.x ?? 0) - svgX, // Store offset X
            nodeStartY: (node.y ?? 0) - svgY, // Store offset Y
          };
        }
      } else {
        // Store info needed to potentially START a pan
        panStartPosRef.current = {
          pointerId: touch.identifier,
          screenX: touch.clientX,
          screenY: touch.clientY,
          vbX: transform.x,
          vbY: transform.y,
        };
      }
    } else if (touches.length === 2) {
      // --- Start Pinch ---
      // Immediately cancel any single-touch actions (long press, potential drag/pan)
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      longPressNodeRef.current = null; // Clear long press candidate
      dragStartPosRef.current = null; // Clear potential drag start info
      panStartPosRef.current = null; // Clear potential pan start info
      setIsDraggingNode(null); // Ensure not dragging
      setIsPanning(false); // Ensure not panning

      const touch1 = touches[0];
      const touch2 = touches[1];
      setIsPinching(true);
      pinchStartRef.current = {
        distance: getTouchDistance(touch1, touch2),
        midpoint: getTouchMidpoint(touch1, touch2),
        initialTransform: { ...transform }, // Store the transform when pinch started
      };
      event.preventDefault(); // Prevent default actions during pinch
    } else {
      // More than 2 touches - cancel interactions for simplicity
      dragStartPosRef.current = null;
      panStartPosRef.current = null;
      pinchStartRef.current = null;
      setIsDraggingNode(null);
      setIsPanning(false);
      setIsPinching(false);
    }
  };

  const handleTouchMove = (event: React.TouchEvent<SVGSVGElement>) => {
    const touches = event.touches;

    // --- Clear Long Press if finger moves significantly ---
    if (
      longPressTimerRef.current &&
      touches.length > 0 &&
      touchStartPosRef.current
    ) {
      const touch = touches[0]; // Check movement of the first finger
      const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
      const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
      if (dx > 5 || dy > 5) {
        // Movement threshold to cancel long press/tap intent
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
        longPressNodeRef.current = null; // No longer a long press candidate
      }
    }

    if (touches.length === 1 && !isPinching) {
      // Single finger move
      const touch = touches[0];

      // --- Decide if starting Drag or Pan ---
      // Check if we *should* start dragging (if not already dragging, and have drag start info)
      if (
        !isDraggingNode &&
        dragStartPosRef.current?.pointerId === touch.identifier
      ) {
        const dx = Math.abs(touch.clientX - dragStartPosRef.current.screenX);
        const dy = Math.abs(touch.clientY - dragStartPosRef.current.screenY);
        if (dx > 5 || dy > 5) {
          // Movement threshold to confirm drag start
          setIsDraggingNode(longPressNodeRef.current?.id.toString() ?? null); // Start the drag state
          setIsPanning(false);
          panStartPosRef.current = null; // Ensure not panning
          if (longPressTimerRef.current)
            clearTimeout(longPressTimerRef.current); // Cancel long press
          longPressTimerRef.current = null;
          longPressNodeRef.current = null; // Not a long press anymore
          event.preventDefault(); // Prevent scroll once dragging confirmed
        }
      }
      // Check if we *should* start panning (if not already panning, and have pan start info)
      else if (
        !isPanning &&
        !isDraggingNode &&
        panStartPosRef.current?.pointerId === touch.identifier
      ) {
        const dx = Math.abs(touch.clientX - panStartPosRef.current.screenX);
        const dy = Math.abs(touch.clientY - panStartPosRef.current.screenY);
        if (dx > 5 || dy > 5) {
          // Movement threshold to confirm pan start
          setIsPanning(true); // Start the pan state
          setIsDraggingNode(null);
          dragStartPosRef.current = null; // Ensure not dragging
          if (longPressTimerRef.current)
            clearTimeout(longPressTimerRef.current); // Cancel long press
          longPressTimerRef.current = null;
          longPressNodeRef.current = null; // Not a long press anymore
          event.preventDefault(); // Prevent scroll once panning confirmed
        }
      }

      // --- Handle Active Drag ---
      if (
        isDraggingNode &&
        dragStartPosRef.current?.pointerId === touch.identifier
      ) {
        event.preventDefault(); // Prevent scroll during active drag
        const { x: currentSvgX, y: currentSvgY } = screenToSVGCoords(
          touch.clientX,
          touch.clientY,
        );
        // Use stored offset to calculate new fixed position
        const newFx = currentSvgX + dragStartPosRef.current.nodeStartX;
        const newFy = currentSvgY + dragStartPosRef.current.nodeStartY;

        setNodes((prevNodes) =>
          prevNodes.map((n) =>
            n.id === isDraggingNode ? { ...n, fx: newFx, fy: newFy } : n,
          ),
        );
        alphaRef.current = Math.max(alphaRef.current, 0.1); // Keep sim active
        if (simulationRef.current === null && nodes.length > 0) {
          simulationRef.current = requestAnimationFrame(runSimulationTick);
        }
      }
      // --- Handle Active Pan ---
      else if (
        isPanning &&
        panStartPosRef.current?.pointerId === touch.identifier
      ) {
        event.preventDefault(); // Prevent scroll during active pan
        // Calculate delta screen movement
        const dx = touch.clientX - panStartPosRef.current.screenX;
        const dy = touch.clientY - panStartPosRef.current.screenY;
        // Apply delta to the initial viewbox position
        const newTx = panStartPosRef.current.vbX + dx;
        const newTy = panStartPosRef.current.vbY + dy;
        setTransform((prev) => ({ ...prev, x: newTx, y: newTy }));
      }
    } else if (touches.length === 2 && isPinching && pinchStartRef.current) {
      // Two fingers move (pinch)
      event.preventDefault(); // Prevent default browser pinch zoom/scroll
      const touch1 = touches[0];
      const touch2 = touches[1];
      const currentDistance = getTouchDistance(touch1, touch2);
      const currentMidpoint = getTouchMidpoint(touch1, touch2);

      const scaleChange = currentDistance / pinchStartRef.current.distance;
      const initialTransform = pinchStartRef.current.initialTransform;
      const newScaleUnclamped = initialTransform.k * scaleChange;

      // Clamp scale
      const minScale = 0.1;
      const maxScale = 8;
      const newScale = Math.max(
        minScale,
        Math.min(maxScale, newScaleUnclamped),
      );

      // Calculate the SVG point under the initial midpoint *using the initial transform*
      const { x: initialMidpointSVGX, y: initialMidpointSVGY } = getSVGPoint(
        pinchStartRef.current.midpoint.x,
        pinchStartRef.current.midpoint.y,
      );
      const initialViewboxPointX =
        (initialMidpointSVGX - initialTransform.x) / initialTransform.k;
      const initialViewboxPointY =
        (initialMidpointSVGY - initialTransform.y) / initialTransform.k;

      // Calculate the new translation (tx, ty)
      // We want the initial SVG point (initialViewboxPointX, Y) to end up under the current screen midpoint (currentMidpoint.x, y)
      // currentMidpoint (screen) = SVGtoScreen(initialViewboxPoint * newScale + newT)
      // Use the raw SVG point under the current midpoint for easier calculation:
      const { x: currentMidpointSVGX, y: currentMidpointSVGY } = getSVGPoint(
        currentMidpoint.x,
        currentMidpoint.y,
      );

      const newTx = currentMidpointSVGX - initialViewboxPointX * newScale;
      const newTy = currentMidpointSVGY - initialViewboxPointY * newScale;

      setTransform({ k: newScale, x: newTx, y: newTy });
    }
  };

  // --- Modify handleTouchEnd ---
  const handleTouchEnd = useCallback(
    (event: React.TouchEvent<SVGSVGElement>) => {
      const touches = event.touches;
      const changedTouches = event.changedTouches;

      // --- Existing drag/pan/pinch ending logic ---
      let wasDragging = false;
      let dragJustEnded = false;
      let wasPanning = false;
      let pinchJustEnded = isPinching && touches.length < 2;
      const currentDraggingNodeId = isDraggingNode; // Capture before state change

      for (let i = 0; i < changedTouches.length; i++) {
        const touch = changedTouches[i];
        if (
          currentDraggingNodeId &&
          dragStartPosRef.current?.pointerId === touch.identifier
        ) {
          // ... release node fixation ...
          wasDragging = true;
          dragJustEnded = true;
          setIsDraggingNode(null);
          dragStartPosRef.current = null;
        }
        if (
          isPanning &&
          panStartPosRef.current?.pointerId === touch.identifier
        ) {
          wasPanning = true;
          setIsPanning(false);
          panStartPosRef.current = null;
        }
      }

      if (pinchJustEnded) {
        setIsPinching(false);
        pinchStartRef.current = null;
      }
      // --- End of drag/pan/pinch ending logic ---

      // --- Revised Tap Logic ---
      // Check conditions for a valid tap
      if (
        changedTouches.length === 1 &&
        !dragJustEnded &&
        !pinchJustEnded &&
        longPressTimerRef.current === null &&
        touchStartPosRef.current /* Add other relevant checks */
      ) {
        const touch = changedTouches[0];
        // Use elementFromPoint to reliably get the element under the finger at the moment of release
        const target = document.elementFromPoint(
          touch.clientX,
          touch.clientY,
        ) as Element;

        if (target) {
          // Check if the tap occurred INSIDE the NodePanel using the ref
          const isTapInsideNodePanel = nodePanelRef.current?.contains(target);

          // Find node element within SVG context
          const nodeElement = target.closest("g[data-node-id]");

          // Check movement threshold for tap
          const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
          const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);

          if (dx < 8 && dy < 8) {
            // Tap movement threshold
            if (nodeElement && !isTapInsideNodePanel /* && onNodeSelect */) {
              // Tap was on a node, outside the panel
              const nodeId = nodeElement.getAttribute("data-node-id");
              const node = nodeMap[nodeId!];
              // Example: Trigger selection/navigation
              // if (node && typeof onNodeSelect === 'function') onNodeSelect(event as any, node);
              // if (node && typeof onNodeNavigate === 'function') onNodeNavigate(event as any, node);
            } else if (
              !nodeElement &&
              !isTapInsideNodePanel &&
              typeof handleClosePanel === "function"
            ) {
              // Tap was NOT on a node AND NOT inside the panel -> treat as background tap
              handleClosePanel(); // Close the panel
            } else if (isTapInsideNodePanel) {
              // Tap was INSIDE the panel. Do nothing here. Let the panel handle it.
            }
          }
        } else {
          // Optionally close panel if tap is in truly empty space? Needs careful checking.
          // if (!nodePanelRef.current && typeof handleClosePanel === 'function') { handleClosePanel(); }
        }
      }

      // --- Rest of touch end cleanup (resetting refs, handling pinch end transition) ---
      touchStartPosRef.current = null; // Clear tap start position after check
      if (touches.length === 0) {
        longPressNodeRef.current = null; // Clear long press candidate if no fingers left
      }
      // ... other cleanup ...

      // Add dependencies
    },
    [
      isDraggingNode,
      isPanning,
      isPinching,
      handleClosePanel,
      nodeMap,
      onNodeSelect,
      onNodeNavigate /* , other states/refs */,
    ],
  );

  // Add handler for cancelled touches (e.g., browser interruption)
  const handleTouchCancel = (event: React.TouchEvent<SVGSVGElement>) => {
    // Treat cancel like touch end - clean up all interaction states
    setIsDraggingNode(null);
    dragStartPosRef.current = null;
    setIsPanning(false);
    panStartPosRef.current = null;
    setIsPinching(false);
    pinchStartRef.current = null;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
    longPressNodeRef.current = null;
  };

  const startNodeDrag = useCallback(
    (
      nodeId: string,
      pointerId: number | null,
      screenX: number,
      screenY: number,
    ) => {
      setIsDraggingNode(nodeId);
      setIsPanning(false); // Ensure panning stops
      const node = nodeMap[nodeId]; // Get node data using the memoized map
      if (!node) return;

      // Use screenToSVGCoords to find where the drag *started* in the graph's coordinate system
      // Note: We calculate the initial offset from the node's *current* center for smoother dragging
      // This replaces storing nodeStartX/Y directly.
      const { x: svgX, y: svgY } = screenToSVGCoords(screenX, screenY);
      const initialOffsetX = (node.x ?? 0) - svgX;
      const initialOffsetY = (node.y ?? 0) - svgY;

      setNodes((prevNodes) =>
        prevNodes.map((n) => {
          if (n.id === nodeId) {
            // Store screen coords for movement calculation AND the offset
            dragStartPosRef.current = {
              pointerId,
              screenX, // Store screen coords for delta calculation in move handlers
              screenY,
              // Instead of nodeStartX/Y, store the offset from the pointer to the node center
              nodeStartX: initialOffsetX, // Re-using fields, but meaning changed slightly
              nodeStartY: initialOffsetY,
            };
            return { ...n, fx: n.x, fy: n.y }; // Fix the node
          }
          return n;
        }),
      );
      // Restart simulation
      alphaRef.current = Math.max(alphaRef.current, 0.1);
      if (simulationRef.current === null && nodes.length > 0) {
        // Check nodes length
        simulationRef.current = requestAnimationFrame(runSimulationTick);
      }
    },
    [screenToSVGCoords, runSimulationTick, nodeMap, nodes],
  ); // Add nodeMap, nodes dependencies

  // NEW: Unified function to start panning
  const startPan = useCallback(
    (pointerId: number | null, screenX: number, screenY: number) => {
      if (isDraggingNode || isPinching) return; // Don't pan if dragging or pinching
      setIsPanning(true);
      panStartPosRef.current = {
        pointerId,
        screenX,
        screenY,
        vbX: transform.x, // Store initial transform x/y
        vbY: transform.y,
      };
    },
    [isDraggingNode, isPinching, transform],
  );

  const handleWheel = useCallback(
    (event: React.WheelEvent<SVGSVGElement>) => {
      event.preventDefault(); // Prevent page scroll when zooming graph
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

      // SVG point under the mouse *before* zoom, in the viewbox coordinate system
      const { x: viewboxMouseX, y: viewboxMouseY } = screenToSVGCoords(
        event.clientX,
        event.clientY,
      );

      // Raw SVG coordinate of the mouse (relative to SVG top-left)
      const { x: screenMouseX, y: screenMouseY } = getSVGPoint(
        event.clientX,
        event.clientY,
      );

      // Calculate the new translation (tx, ty) so the point under the mouse stays put
      // screenMouse = viewboxMouse * newScale + newTransform
      // newTransform = screenMouse - viewboxMouse * newScale
      const newTx = screenMouseX - viewboxMouseX * newScale;
      const newTy = screenMouseY - viewboxMouseY * newScale;

      setTransform({ k: newScale, x: newTx, y: newTy });
    },
    [transform, screenToSVGCoords, getSVGPoint], // Include updated dependencies
  );

  const currentWidth = propWidth ?? dimensions.width;
  const currentHeight = propHeight ?? dimensions.height;

  const handleNodeContextMenu = (
    event: React.MouseEvent<SVGGElement> | React.TouchEvent<SVGGElement>,
    node: INode | IDerivedNode,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    let clientX = 0;
    let clientY = 0;

    // Check if it's a touch event first
    if ("touches" in event && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if ("changedTouches" in event && event.changedTouches.length > 0) {
      // If triggered by long press on touchend, use changedTouches
      clientX = event.changedTouches[0].clientX;
      clientY = event.changedTouches[0].clientY;
    } else if ("clientX" in event) {
      // Fallback to mouse event
      clientX = event.clientX;
      clientY = event.clientY;
    }

    // Close any existing panel before opening a new one
    setNodePanel(null);
    // Use setTimeout to ensure the state update happens after potential previous close
    setTimeout(() => {
      setNodePanel({
        node,
        position: { x: clientX || 0, y: clientY || 0 },
        onClose: () => {
          setNodePanel(null);
        }, // Add onClose callback
      });
    }, 0);
  };

  const handleBackgroundClick = () => {
    setNodePanel(null);
  };

  // const {
  //   filter: { get: getFilter },
  // } = useGraph();
  // const { filter } = getFilter();

  // const filteredSet = new Set();
  // const filteredNodes = nodes.filter((n) => {
  //   const shouldInclude = filter(n);
  //   if (shouldInclude) {
  //     filteredSet.add(n.id);
  //   } else {
  //     filteredSet.delete(n.id);
  //   }
  //   return shouldInclude;
  // });
  // const filteredEdges = graph.edges.filter((e) => {
  //   return (
  //     filteredSet.has(e.source.toString()) &&
  //     filteredSet.has(e.target.toString())
  //   );
  // });

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", overflow: "hidden" }}
      className={styles.container}
      onClick={handleBackgroundClick}
    >
      {nodePanel && <NodePanel ref={nodePanelRef} {...nodePanel} />}
      {currentWidth > 0 && currentHeight > 0 && nodes.length ? (
        <svg
          ref={svgRef}
          width={currentWidth}
          height={currentHeight}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown} // Use revised mouse down handler
          // Add Touch Handlers
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          style={{
            cursor: isDraggingNode
              ? "grabbing"
              : isPanning
                ? "grabbing"
                : "grab",
            // touchAction: 'none' // Recommended to apply via CSS instead
          }}
        >
          <g
            className="everything"
            transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}
          >
            {edges.map((edge, i) => (
              <Edge
                key={`${edge.id}`}
                edge={edge}
                sourceNode={nodeMap[edge.source]}
                targetNode={nodeMap[edge.target]}
              />
            ))}
            {nodes.map((node, i) => {
              return (
                <Node
                  key={node.id.toString()}
                  node={node}
                  isDragging={isDraggingNode === node.id} // Correct check
                  onNodeSelect={onNodeSelect}
                  onNodeNavigate={onNodeNavigate}
                  onContextMenu={handleNodeContextMenu}
                  data-node-id={node.id.toString()}
                />
              );
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
