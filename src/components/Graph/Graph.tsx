import React, { useState, useEffect, useRef, useCallback } from "react";
import { IEdge, IGraph, INode } from "../../declarations/graph"; // Adjust path as needed
import Node from "./Node";
import Edge from "./Edge";
import styles from "./Graph.module.scss";
import { Flex, Text } from "@mantine/core"; // Assuming you still use Mantine
import NodePanel from "./NodePanel";
import { useGraph } from "../../contexts/GraphContext";

// --- Simulation Configuration ---
const SIMULATION_CONFIG = {
  forceStrength: -1000,
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
  const workerRef = useRef<Worker | null>(null);

  const [isDraggingNode, setIsDraggingNode] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const pinchStartRef = useRef<{
    distance: number;
    midpoint: { x: number; y: number };
    initialTransform: { k: number; x: number; y: number };
  } | null>(null);

  const longPressTimerRef = useRef<Timer | null>(null);
  const longPressNodeRef = useRef<INode | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const nodeMap = React.useMemo(() => {
    return nodes.reduce(
      (acc, node) => {
        acc[node.id.toString()] = node;
        return acc;
      },
      {} as { [key: string]: INode },
    );
  }, [nodes]);

  const dragStartPosRef = useRef<{
    pointerId: number | null;
    screenX: number;
    screenY: number;
    nodeStartX: number;
    nodeStartY: number;
  } | null>(null);

  const panStartPosRef = useRef<{
    pointerId: number | null;
    screenX: number;
    screenY: number;
    vbX: number;
    vbY: number;
  } | null>(null);

  const nodePanelRef = useRef<HTMLDivElement>(null);
  const [nodePanel, setNodePanel] = useState<{
    node: INode;
    position: { x: number; y: number };
    onClose: () => void;
  } | null>(null);

  const handleClosePanel = useCallback(() => {
    setNodePanel(null);
  }, []);

  const LONG_PRESS_DURATION = 500;
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

  useEffect(() => {
    if (isNavigating || !graph.nodes.length) {
      return;
    }

    const worker = new Worker(
      new URL("../../workers/graph.worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;

    const currentWidth = propWidth ?? dimensions.width;
    const currentHeight = propHeight ?? dimensions.height;

    setTransform({ k: 1, x: currentWidth / 2, y: currentHeight / 2 });

    const initialNodes = graph.nodes.map((node) => ({
      ...node,
      x: node.x,
      y: node.y,
    }));
    setNodes(initialNodes);

    worker.postMessage({
      type: "update_data",
      payload: { nodes: initialNodes, edges: graph.edges },
    });

    worker.onmessage = (event) => {
      const { type, nodes: updatedNodes } = event.data;
      if (type === "tick") {
        setNodes((currentNodes) => {
          const nodePositionMap = new Map<string, { x: number; y: number }>(
            updatedNodes.map((n: INode) => [n.id, { x: n.x, y: n.y }]),
          );
          return currentNodes.map((node) => {
            const updatedPosition = nodePositionMap.get(node.id.toString());
            if (updatedPosition) {
              return { ...node, x: updatedPosition.x, y: updatedPosition.y };
            }
            return node;
          });
        });
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [
    graph.nodes,
    graph.edges,
    dimensions,
    propWidth,
    propHeight,
    isNavigating,
  ]);

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
    [],
  );

  const screenToSVGCoords = useCallback(
    (screenX: number, screenY: number): { x: number; y: number } => {
      const { x: svgX, y: svgY } = getSVGPoint(screenX, screenY);
      return {
        x: (svgX - transform.x) / transform.k,
        y: (svgY - transform.y) / transform.k,
      };
    },
    [getSVGPoint, transform],
  );

  const handleMouseDown = (event: React.MouseEvent<SVGSVGElement>) => {
    const target = event.target as SVGElement;
    const nodeElement = target.closest("[data-node-id]");

    if (event.button === 0) {
      if (nodeElement) {
        const nodeId = nodeElement.getAttribute("data-node-id");
        if (nodeId) {
          startNodeDrag(nodeId, null, event.clientX, event.clientY);
        }
      } else {
        startPan(null, event.clientX, event.clientY);
      }
    }
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (
      isDraggingNode &&
      dragStartPosRef.current?.pointerId === null &&
      workerRef.current
    ) {
      const { x: currentSvgX, y: currentSvgY } = screenToSVGCoords(
        event.clientX,
        event.clientY,
      );
      const newFx = currentSvgX + dragStartPosRef.current.nodeStartX;
      const newFy = currentSvgY + dragStartPosRef.current.nodeStartY;

      workerRef.current.postMessage({
        type: "update_node_position",
        payload: { id: isDraggingNode, fx: newFx, fy: newFy },
      });
    } else if (isPanning && panStartPosRef.current?.pointerId === null) {
      const dx = event.clientX - panStartPosRef.current.screenX;
      const dy = event.clientY - panStartPosRef.current.screenY;
      const newTx = panStartPosRef.current.vbX + dx;
      const newTy = panStartPosRef.current.vbY + dy;
      setTransform((prev) => ({ ...prev, x: newTx, y: newTy }));
    }
  };

  const handleMouseUp = useCallback(
    (event: MouseEvent) => {
      const target = event.target as Element;

      const isClickInsideNodePanel = nodePanelRef.current?.contains(target);

      const wasDragging =
        !!isDraggingNode && dragStartPosRef.current?.pointerId === null;
      const wasPanning =
        !!isPanning && panStartPosRef.current?.pointerId === null;
      let dragJustEnded = false;

      if (wasDragging) {
        if (isDraggingNode && workerRef.current) {
          workerRef.current.postMessage({
            type: "end_node_drag",
            payload: { id: isDraggingNode },
          });
        }
        dragJustEnded = true;
        setIsDraggingNode(null);
        dragStartPosRef.current = null;
      }
      if (wasPanning) {
        setIsPanning(false);
        panStartPosRef.current = null;
      }
      if (!dragJustEnded && event.button === 0) {
        const nodeElement = target.closest("g[data-node-id]"); // Check closest <g>

        if (nodeElement && !isClickInsideNodePanel) {
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

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleTouchStart = (event: React.TouchEvent<SVGSVGElement>) => {
    const touches = event.touches;

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (touches.length === 1) {
      const touch = touches[0];
      const target = event.target as SVGElement;
      const nodeElement = target.closest("[data-node-id]");

      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

      if (nodeElement) {
        const nodeId = nodeElement.getAttribute("data-node-id");
        const node = nodeMap[nodeId!];
        if (nodeId && node) {
          longPressNodeRef.current = node;

          longPressTimerRef.current = setTimeout(() => {
            if (longPressNodeRef.current) {
              handleNodeContextMenu(event as any, longPressNodeRef.current);
              setIsDraggingNode(null);
              dragStartPosRef.current = null;
              setIsPanning(false);
              panStartPosRef.current = null;
              longPressNodeRef.current = null;
            }
            longPressTimerRef.current = null;
          }, LONG_PRESS_DURATION);

          const { x: svgX, y: svgY } = screenToSVGCoords(
            touch.clientX,
            touch.clientY,
          );
          dragStartPosRef.current = {
            pointerId: touch.identifier,
            screenX: touch.clientX,
            screenY: touch.clientY,
            nodeStartX: (node.x ?? 0) - svgX,
            nodeStartY: (node.y ?? 0) - svgY,
          };
        }
      } else {
        panStartPosRef.current = {
          pointerId: touch.identifier,
          screenX: touch.clientX,
          screenY: touch.clientY,
          vbX: transform.x,
          vbY: transform.y,
        };
      }
    } else if (touches.length === 2) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      longPressNodeRef.current = null;
      dragStartPosRef.current = null;
      panStartPosRef.current = null;
      setIsDraggingNode(null);
      setIsPanning(false);

      const touch1 = touches[0];
      const touch2 = touches[1];
      setIsPinching(true);
      pinchStartRef.current = {
        distance: getTouchDistance(touch1, touch2),
        midpoint: getTouchMidpoint(touch1, touch2),
        initialTransform: { ...transform },
      };
      event.preventDefault();
    } else {
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

    if (
      longPressTimerRef.current &&
      touches.length > 0 &&
      touchStartPosRef.current
    ) {
      const touch = touches[0];
      const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
      const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
      if (dx > 5 || dy > 5) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
        longPressNodeRef.current = null;
      }
    }

    if (touches.length === 1 && !isPinching) {
      const touch = touches[0];

      if (
        !isDraggingNode &&
        dragStartPosRef.current?.pointerId === touch.identifier
      ) {
        const dx = Math.abs(touch.clientX - dragStartPosRef.current.screenX);
        const dy = Math.abs(touch.clientY - dragStartPosRef.current.screenY);
        if (dx > 5 || dy > 5) {
          setIsDraggingNode(longPressNodeRef.current?.id.toString() ?? null);
          setIsPanning(false);
          panStartPosRef.current = null;
          if (longPressTimerRef.current)
            clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
          longPressNodeRef.current = null;
          event.preventDefault();
        }
      } else if (
        !isPanning &&
        !isDraggingNode &&
        panStartPosRef.current?.pointerId === touch.identifier
      ) {
        const dx = Math.abs(touch.clientX - panStartPosRef.current.screenX);
        const dy = Math.abs(touch.clientY - panStartPosRef.current.screenY);
        if (dx > 5 || dy > 5) {
          setIsPanning(true);
          setIsDraggingNode(null);
          dragStartPosRef.current = null;
          if (longPressTimerRef.current)
            clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
          longPressNodeRef.current = null;
          event.preventDefault();
        }
      }

      if (
        isDraggingNode &&
        dragStartPosRef.current?.pointerId === touch.identifier &&
        workerRef.current
      ) {
        event.preventDefault();
        const { x: currentSvgX, y: currentSvgY } = screenToSVGCoords(
          touch.clientX,
          touch.clientY,
        );
        const newFx = currentSvgX + dragStartPosRef.current.nodeStartX;
        const newFy = currentSvgY + dragStartPosRef.current.nodeStartY;

        workerRef.current.postMessage({
          type: "update_node_position",
          payload: { id: isDraggingNode, fx: newFx, fy: newFy },
        });
      } else if (
        isPanning &&
        panStartPosRef.current?.pointerId === touch.identifier
      ) {
        event.preventDefault();
        const dx = touch.clientX - panStartPosRef.current.screenX;
        const dy = touch.clientY - panStartPosRef.current.screenY;
        const newTx = panStartPosRef.current.vbX + dx;
        const newTy = panStartPosRef.current.vbY + dy;
        setTransform((prev) => ({ ...prev, x: newTx, y: newTy }));
      }
    } else if (touches.length === 2 && isPinching && pinchStartRef.current) {
      event.preventDefault();
      const touch1 = touches[0];
      const touch2 = touches[1];
      const currentDistance = getTouchDistance(touch1, touch2);
      const currentMidpoint = getTouchMidpoint(touch1, touch2);

      const scaleChange = currentDistance / pinchStartRef.current.distance;
      const initialTransform = pinchStartRef.current.initialTransform;
      const newScaleUnclamped = initialTransform.k * scaleChange;

      const minScale = 0.1;
      const maxScale = 8;
      const newScale = Math.max(
        minScale,
        Math.min(maxScale, newScaleUnclamped),
      );

      const { x: initialMidpointSVGX, y: initialMidpointSVGY } = getSVGPoint(
        pinchStartRef.current.midpoint.x,
        pinchStartRef.current.midpoint.y,
      );
      const initialViewboxPointX =
        (initialMidpointSVGX - initialTransform.x) / initialTransform.k;
      const initialViewboxPointY =
        (initialMidpointSVGY - initialTransform.y) / initialTransform.k;

      const { x: currentMidpointSVGX, y: currentMidpointSVGY } = getSVGPoint(
        currentMidpoint.x,
        currentMidpoint.y,
      );

      const newTx = currentMidpointSVGX - initialViewboxPointX * newScale;
      const newTy = currentMidpointSVGY - initialViewboxPointY * newScale;

      setTransform({ k: newScale, x: newTx, y: newTy });
    }
  };

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent<SVGSVGElement>) => {
      const touches = event.touches;
      const changedTouches = event.changedTouches;

      let wasDragging = false;
      let dragJustEnded = false;
      let wasPanning = false;
      let pinchJustEnded = isPinching && touches.length < 2;
      const currentDraggingNodeId = isDraggingNode;

      for (let i = 0; i < changedTouches.length; i++) {
        const touch = changedTouches[i];
        if (
          currentDraggingNodeId &&
          dragStartPosRef.current?.pointerId === touch.identifier
        ) {
          if (workerRef.current) {
            workerRef.current.postMessage({
              type: "end_node_drag",
              payload: { id: currentDraggingNodeId },
            });
          }
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
      if (
        changedTouches.length === 1 &&
        !dragJustEnded &&
        !pinchJustEnded &&
        longPressTimerRef.current === null &&
        touchStartPosRef.current
      ) {
        const touch = changedTouches[0];
        const target = document.elementFromPoint(
          touch.clientX,
          touch.clientY,
        ) as Element;

        if (target) {
          const isTapInsideNodePanel = nodePanelRef.current?.contains(target);
          const nodeElement = target.closest("g[data-node-id]");

          const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
          const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);

          if (dx < 8 && dy < 8) {
            if (nodeElement && !isTapInsideNodePanel /* && onNodeSelect */) {
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

      touchStartPosRef.current = null;
      if (touches.length === 0) {
        longPressNodeRef.current = null;
      }
    },
    [
      isDraggingNode,
      isPanning,
      isPinching,
      handleClosePanel,
      nodeMap,
      onNodeSelect,
      onNodeNavigate,
    ],
  );

  const handleTouchCancel = (event: React.TouchEvent<SVGSVGElement>) => {
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
      setIsPanning(false);
      const node = nodeMap[nodeId];
      if (!node || !workerRef.current) return;

      const { x: svgX, y: svgY } = screenToSVGCoords(screenX, screenY);

      dragStartPosRef.current = {
        pointerId,
        screenX,
        screenY,
        nodeStartX: (node.x ?? 0) - svgX,
        nodeStartY: (node.y ?? 0) - svgY,
      };

      workerRef.current.postMessage({
        type: "update_node_position",
        payload: { id: nodeId, fx: node.x, fy: node.y },
      });
    },
    [screenToSVGCoords, nodeMap],
  );

  const startPan = useCallback(
    (pointerId: number | null, screenX: number, screenY: number) => {
      if (isDraggingNode || isPinching) return;
      setIsPanning(true);
      panStartPosRef.current = {
        pointerId,
        screenX,
        screenY,
        vbX: transform.x,
        vbY: transform.y,
      };
    },
    [isDraggingNode, isPinching, transform],
  );

  const handleWheel = useCallback(
    (event: React.WheelEvent<SVGSVGElement>) => {
      event.preventDefault();
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

      const { x: viewboxMouseX, y: viewboxMouseY } = screenToSVGCoords(
        event.clientX,
        event.clientY,
      );

      const { x: screenMouseX, y: screenMouseY } = getSVGPoint(
        event.clientX,
        event.clientY,
      );

      const newTx = screenMouseX - viewboxMouseX * newScale;
      const newTy = screenMouseY - viewboxMouseY * newScale;

      setTransform({ k: newScale, x: newTx, y: newTy });
    },
    [transform, screenToSVGCoords, getSVGPoint],
  );

  const currentWidth = propWidth ?? dimensions.width;
  const currentHeight = propHeight ?? dimensions.height;

  const handleNodeContextMenu = (
    event: React.MouseEvent<SVGGElement> | React.TouchEvent<SVGGElement>,
    node: INode,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    let clientX = 0;
    let clientY = 0;

    if ("touches" in event && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if ("changedTouches" in event && event.changedTouches.length > 0) {
      clientX = event.changedTouches[0].clientX;
      clientY = event.changedTouches[0].clientY;
    } else if ("clientX" in event) {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    setNodePanel(null);
    setTimeout(() => {
      setNodePanel({
        node,
        position: { x: clientX || 0, y: clientY || 0 },
        onClose: () => {
          setNodePanel(null);
        },
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
  //

  const handleNodeSelect = (
    event: React.MouseEvent<SVGGElement> | React.TouchEvent<SVGGElement>,
    node: INode,
  ) => {
    onNodeSelect?.(event, node);
  };

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
          onMouseDown={handleMouseDown}
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
                  scaleFactor={transform.k}
                  isDragging={isDraggingNode === node.id} // Correct check
                  onNodeSelect={handleNodeSelect}
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
