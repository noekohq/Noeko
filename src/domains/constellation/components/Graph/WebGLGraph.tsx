import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { INode } from "@/declarations/graph";
import { normalizeGraph } from "@infrastructure/graph/model";
import { useGraph } from "@domains/constellation/contexts/GraphContext";
import { useGraphTraversal } from "./useGraphTraversal";
import NodePanel from "./NodePanel";
import { GraphPanel } from "./GraphPanel";
import LangtonsAntLoader from "@core/design/components/Loading/AntLoader";
import type { IGraphContainerProps, IGraphController } from "./Graph";
import { WebGLGraphRenderer, type IGraphViewport, type INodePosition } from "./webgl/WebGLRenderer";
import styles from "./WebGLGraph.module.scss";
import { useSettings } from "@/contexts/SettingsContext";
import { DEFAULT_CONSTELLATION_VISUAL_MODE, type IConstellationVisualMode } from "./visualModes";

type IWebGLGraphProps = IGraphContainerProps & {
  onUnavailable?: () => void;
  visualMode?: IConstellationVisualMode;
};

type IPointerInteraction = {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  nodeId?: string;
  nodeOffsetX?: number;
  nodeOffsetY?: number;
  moved: boolean;
};

const MIN_SCALE = 0.08;
const MAX_SCALE = 8;
const DRAG_THRESHOLD = 4;
const PICK_CELL_SIZE = 100;
const PREWARM_NODE_THRESHOLD = 160;

const getWarmupTicks = (nodeCount: number) => {
  if (nodeCount < PREWARM_NODE_THRESHOLD) return 0;
  if (nodeCount >= 2500) return 80;
  if (nodeCount >= 1000) return 100;
  return 120;
};

const WebGLGraph = forwardRef<IGraphController, IWebGLGraphProps>(
  (
    {
      graph,
      onNodeNavigate,
      onNodeSelect,
      isNavigating,
      onUnavailable,
      visualMode = DEFAULT_CONSTELLATION_VISUAL_MODE,
      semanticOverlay,
      traceOverlay,
      onTraceSelection,
      onMutationComplete,
      onExploreSemantic,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const labelsRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<WebGLGraphRenderer | null>(null);
    const workerRef = useRef<Worker | null>(null);
    const frameRef = useRef<number | null>(null);
    const dimensionsRef = useRef({ width: 0, height: 0 });
    const positionsRef = useRef<Map<string, INodePosition>>(new Map());
    const positionRevisionRef = useRef(0);
    const styleRevisionRef = useRef(0);
    const hoveredRef = useRef<string | undefined>(undefined);
    const interactionSourceRef = useRef<string | undefined>(undefined);
    const spatialIndexRef = useRef<Map<string, string[]>>(new Map());
    const spatialIndexRevisionRef = useRef(-1);
    const viewportRef = useRef<IGraphViewport>({ scale: 0.4, x: 0, y: 0 });
    const pointerRef = useRef<IPointerInteraction | null>(null);
    const nodePanelRef = useRef<HTMLDivElement>(null);
    const graphPanelRef = useRef<HTMLDivElement>(null);
    const topology = useMemo(() => normalizeGraph(graph), [graph]);
    const topologyRef = useRef(topology);
    topologyRef.current = topology;

    const [nodePanel, setNodePanel] = useState<{
      node: INode;
      position: { x: number; y: number };
      onClose: () => void;
    } | null>(null);
    const [graphPanel, setGraphPanel] = useState<{
      position: { x: number; y: number };
      onClose: () => void;
    } | null>(null);
    const [layoutReady, setLayoutReady] = useState(
      () => topology.nodes.length < PREWARM_NODE_THRESHOLD
    );

    const {
      focused: { get: focused },
      selected: { get: selected, add: addSelected, remove: removeSelected },
      highlighted: { get: highlighted },
      filter: { get: getFilter },
      loading: { get: getLoading },
    } = useGraph();
    const filterConfig = getFilter();
    const loading = getLoading();
    const {
      ui: {
        graphics: {
          mode: { get: graphicsMode },
        },
      },
    } = useSettings();
    const selectedRef = useRef(selected);
    const highlightedRef = useRef(highlighted);
    const focusedRef = useRef(focused);
    const filterRef = useRef(filterConfig.filter);
    const loadingRef = useRef(loading);
    const visualModeRef = useRef(visualMode);
    const semanticOverlayRef = useRef(semanticOverlay);
    const traceOverlayRef = useRef(traceOverlay);
    const effectsEnabledRef = useRef(graphicsMode === "full" && visualMode !== "static");
    selectedRef.current = selected;
    highlightedRef.current = highlighted;
    focusedRef.current = focused;
    filterRef.current = filterConfig.filter;
    loadingRef.current = loading;
    visualModeRef.current = visualMode;
    semanticOverlayRef.current = semanticOverlay;
    traceOverlayRef.current = traceOverlay;
    effectsEnabledRef.current = graphicsMode === "full" && visualMode !== "static";

    const scheduleDrawRef = useRef<() => void>(() => {});

    const { clusterSelect, clusterDeselect } = useGraphTraversal({
      nodeMap: topology.nodesById,
      adjacencyList: topology.adjacencyByNodeId,
    });

    const draw = useCallback(() => {
      const keepAnimating = rendererRef.current?.draw({
        nodes: topologyRef.current.nodes,
        edges: topologyRef.current.edges,
        positions: positionsRef.current,
        viewport: viewportRef.current,
        selected: selectedRef.current,
        highlighted: highlightedRef.current,
        focused: focusedRef.current,
        hovered: hoveredRef.current,
        interactionSource: interactionSourceRef.current,
        effectsEnabled: effectsEnabledRef.current,
        visualMode: visualModeRef.current,
        semanticOverlay: semanticOverlayRef.current,
        traceOverlay: traceOverlayRef.current,
        loading: loadingRef.current,
        filter: filterRef.current,
        positionRevision: positionRevisionRef.current,
        styleRevision: styleRevisionRef.current,
        time: performance.now(),
      });
      if (keepAnimating) scheduleDrawRef.current();
    }, []);

    const scheduleDraw = useCallback(() => {
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        draw();
      });
    }, [draw]);
    scheduleDrawRef.current = scheduleDraw;

    useEffect(() => {
      styleRevisionRef.current += 1;
      workerRef.current?.postMessage({
        type: "update_overlay_edges",
        payload: {
          edges: (semanticOverlay?.edges ?? []).map((edge) => ({
            source: edge.source,
            target: edge.target,
            distance: 190 - edge.similarity * 70,
            strength: 0.04 + edge.similarity * 0.1,
          })),
        },
      });
      scheduleDraw();
    }, [semanticOverlay, traceOverlay, scheduleDraw]);

    const ensureSpatialIndex = useCallback(() => {
      if (spatialIndexRevisionRef.current === positionRevisionRef.current) return;
      const index = new Map<string, string[]>();
      for (const [nodeId, position] of positionsRef.current) {
        const cellX = Math.floor(position.x / PICK_CELL_SIZE);
        const cellY = Math.floor(position.y / PICK_CELL_SIZE);
        const key = `${cellX}:${cellY}`;
        const cell = index.get(key);
        if (cell) cell.push(nodeId);
        else index.set(key, [nodeId]);
      }
      spatialIndexRef.current = index;
      spatialIndexRevisionRef.current = positionRevisionRef.current;
    }, []);

    useEffect(() => {
      const canvas = canvasRef.current;
      const labels = labelsRef.current;
      const container = containerRef.current;
      if (!canvas || !labels || !container) return;

      try {
        rendererRef.current = new WebGLGraphRenderer(canvas, labels);
      } catch (error) {
        console.warn("Unable to initialize the WebGL Constellation renderer", error);
        onUnavailable?.();
        return;
      }

      const handleContextLost = (event: Event) => {
        event.preventDefault();
        onUnavailable?.();
      };
      canvas.addEventListener("webglcontextlost", handleContextLost);

      const updateSize = () => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        const wasUninitialized = dimensionsRef.current.width === 0;
        dimensionsRef.current = { width, height };
        rendererRef.current?.resize(width, height);
        if (wasUninitialized) {
          viewportRef.current = { scale: 0.4, x: width / 2, y: height / 2 };
        }
        scheduleDraw();
      };

      updateSize();
      const resizeObserver = new ResizeObserver(updateSize);
      resizeObserver.observe(container);
      let themeFrame: number | null = null;
      const handleThemeChange = () => {
        if (themeFrame !== null) return;
        themeFrame = requestAnimationFrame(() => {
          themeFrame = null;
          rendererRef.current?.refreshTheme();
          styleRevisionRef.current += 1;
          scheduleDraw();
        });
      };
      const themeObserver = new MutationObserver(handleThemeChange);
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class", "style", "data-mantine-color-scheme"],
      });

      return () => {
        resizeObserver.disconnect();
        themeObserver.disconnect();
        if (themeFrame !== null) cancelAnimationFrame(themeFrame);
        canvas.removeEventListener("webglcontextlost", handleContextLost);
        rendererRef.current?.destroy();
        rendererRef.current = null;
      };
    }, [onUnavailable, scheduleDraw]);

    useEffect(() => {
      workerRef.current?.terminate();
      workerRef.current = null;
      positionsRef.current.clear();
      positionRevisionRef.current += 1;
      spatialIndexRef.current.clear();
      spatialIndexRevisionRef.current = -1;
      setNodePanel(null);
      setGraphPanel(null);
      const warmupTicks = getWarmupTicks(topology.nodes.length);
      setLayoutReady(warmupTicks === 0);

      if (isNavigating || topology.nodes.length === 0) {
        scheduleDraw();
        return;
      }

      const angleIncrement = Math.PI * (3 - Math.sqrt(5));
      const initialNodes = topology.nodes.map((node, index) => {
        const radius = 200 * Math.sqrt(index);
        const angle = index * angleIncrement;
        const position = {
          id: node.id.toString(),
          x: radius * Math.cos(angle),
          y: radius * Math.sin(angle),
        };
        positionsRef.current.set(position.id, { x: position.x, y: position.y });
        return position;
      });
      positionRevisionRef.current += 1;

      const { width, height } = dimensionsRef.current;
      viewportRef.current = { scale: 0.4, x: width / 2, y: height / 2 };
      scheduleDraw();

      const worker = new Worker(
        new URL("@infrastructure/compute/graph.worker.ts", import.meta.url),
        {
          type: "module",
        }
      );
      workerRef.current = worker;
      worker.postMessage({
        type: "update_data",
        payload: {
          nodes: initialNodes,
          compact: true,
          warmupTicks,
          edges: topology.edges.map(({ source, target, distance, strength }) => ({
            source,
            target,
            distance,
            strength,
          })),
        },
      });
      worker.postMessage({
        type: "update_overlay_edges",
        payload: {
          edges: (semanticOverlayRef.current?.edges ?? []).map((edge) => ({
            source: edge.source,
            target: edge.target,
            distance: 190 - edge.similarity * 70,
            strength: 0.04 + edge.similarity * 0.1,
          })),
        },
      });

      worker.onmessage = (event) => {
        if (event.data.type !== "tick" && event.data.type !== "layout_ready") return;
        const positions = event.data.positions as Float32Array;
        for (let index = 0; index < initialNodes.length; index += 1) {
          positionsRef.current.set(initialNodes[index].id, {
            x: positions[index * 2],
            y: positions[index * 2 + 1],
          });
        }
        positionRevisionRef.current += 1;
        scheduleDraw();
        if (event.data.type === "layout_ready") setLayoutReady(true);
      };
      worker.onerror = (error) => {
        console.warn("Unable to finish arranging the Constellation layout", error);
        setLayoutReady(true);
        scheduleDraw();
      };

      return () => {
        worker.terminate();
        if (workerRef.current === worker) workerRef.current = null;
      };
    }, [isNavigating, scheduleDraw, topology]);

    useEffect(() => {
      if (focused) {
        interactionSourceRef.current = focused;
        return;
      }
      const source = interactionSourceRef.current;
      if (source && (selected.has(source) || highlighted.has(source))) return;
      interactionSourceRef.current =
        selected.values().next().value || highlighted.values().next().value;
    }, [focused, highlighted, selected]);

    useEffect(() => {
      styleRevisionRef.current += 1;
      scheduleDraw();
    }, [
      filterConfig,
      focused,
      graphicsMode,
      highlighted,
      loading,
      scheduleDraw,
      selected,
      visualMode,
    ]);

    useEffect(() => {
      if (!focused) return;
      const position = positionsRef.current.get(focused);
      if (!position) return;
      const { width, height } = dimensionsRef.current;
      const scale = 0.75;
      viewportRef.current = {
        scale,
        x: width / 2 - position.x * scale,
        y: height / 2 - position.y * scale,
      };
      scheduleDraw();
    }, [focused, scheduleDraw]);

    useEffect(() => {
      return () => {
        workerRef.current?.terminate();
        if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      };
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        reset: () => {
          const { width, height } = dimensionsRef.current;
          viewportRef.current = { scale: 0.4, x: width / 2, y: height / 2 };
          setNodePanel(null);
          setGraphPanel(null);
          scheduleDraw();
        },
        nodes: () =>
          topologyRef.current.nodes.map((node) => ({
            ...node,
            ...positionsRef.current.get(node.id.toString()),
          })),
      }),
      [scheduleDraw]
    );

    const getLocalPoint = useCallback((clientX: number, clientY: number) => {
      const bounds = canvasRef.current?.getBoundingClientRect();
      return {
        x: clientX - (bounds?.left || 0),
        y: clientY - (bounds?.top || 0),
      };
    }, []);

    const toWorldPoint = useCallback(
      (clientX: number, clientY: number) => {
        const local = getLocalPoint(clientX, clientY);
        return {
          x: (local.x - viewportRef.current.x) / viewportRef.current.scale,
          y: (local.y - viewportRef.current.y) / viewportRef.current.scale,
        };
      },
      [getLocalPoint]
    );

    const pickNode = useCallback(
      (clientX: number, clientY: number) => {
        ensureSpatialIndex();
        const world = toWorldPoint(clientX, clientY);
        const radius = 30;
        let closest: { node: INode; distance: number } | undefined;
        const minCellX = Math.floor((world.x - radius) / PICK_CELL_SIZE);
        const maxCellX = Math.floor((world.x + radius) / PICK_CELL_SIZE);
        const minCellY = Math.floor((world.y - radius) / PICK_CELL_SIZE);
        const maxCellY = Math.floor((world.y + radius) / PICK_CELL_SIZE);

        for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
          for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
            const nodeIds = spatialIndexRef.current.get(`${cellX}:${cellY}`) || [];
            for (const nodeId of nodeIds) {
              const node = topologyRef.current.nodesById[nodeId];
              const position = positionsRef.current.get(nodeId);
              if (!node || !position) continue;
              const distance = Math.hypot(position.x - world.x, position.y - world.y);
              if (distance <= radius && (!closest || distance < closest.distance)) {
                closest = { node, distance };
              }
            }
          }
        }
        return closest?.node;
      },
      [ensureSpatialIndex, toWorldPoint]
    );

    const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (event.button !== 0) return;
      const node = pickNode(event.clientX, event.clientY);
      const nodePosition = node ? positionsRef.current.get(node.id.toString()) : undefined;
      const pointerPosition = toWorldPoint(event.clientX, event.clientY);
      pointerRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        nodeId: node?.id.toString(),
        nodeOffsetX: nodePosition ? nodePosition.x - pointerPosition.x : undefined,
        nodeOffsetY: nodePosition ? nodePosition.y - pointerPosition.y : undefined,
        moved: false,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      const nodeId = node?.id.toString();
      if (hoveredRef.current !== nodeId) {
        hoveredRef.current = nodeId;
        styleRevisionRef.current += 1;
        scheduleDraw();
      }
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
      const interaction = pointerRef.current;
      if (!interaction || interaction.pointerId !== event.pointerId) {
        const hovered = pickNode(event.clientX, event.clientY)?.id.toString();
        event.currentTarget.style.cursor = hovered ? "pointer" : "grab";
        if (hoveredRef.current !== hovered) {
          hoveredRef.current = hovered;
          styleRevisionRef.current += 1;
          scheduleDraw();
        }
        return;
      }

      const totalDistance = Math.hypot(
        event.clientX - interaction.startX,
        event.clientY - interaction.startY
      );
      if (totalDistance > DRAG_THRESHOLD) interaction.moved = true;
      if (!interaction.moved) return;

      if (interaction.nodeId) {
        const world = toWorldPoint(event.clientX, event.clientY);
        const position = {
          x: world.x + (interaction.nodeOffsetX || 0),
          y: world.y + (interaction.nodeOffsetY || 0),
        };
        workerRef.current?.postMessage({
          type: "update_node_position",
          payload: { id: interaction.nodeId, fx: position.x, fy: position.y },
        });
        positionsRef.current.set(interaction.nodeId, position);
        positionRevisionRef.current += 1;
        event.currentTarget.style.cursor = "grabbing";
      } else {
        viewportRef.current = {
          ...viewportRef.current,
          x: viewportRef.current.x + event.clientX - interaction.lastX,
          y: viewportRef.current.y + event.clientY - interaction.lastY,
        };
        event.currentTarget.style.cursor = "grabbing";
      }

      interaction.lastX = event.clientX;
      interaction.lastY = event.clientY;
      scheduleDraw();
    };

    const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
      const interaction = pointerRef.current;
      if (!interaction || interaction.pointerId !== event.pointerId) return;
      pointerRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
      event.currentTarget.style.cursor = interaction.nodeId ? "pointer" : "grab";

      if (interaction.nodeId && interaction.moved) {
        workerRef.current?.postMessage({
          type: "end_node_drag",
          payload: { id: interaction.nodeId },
        });
        return;
      }
      if (interaction.moved) return;

      const nodeId = interaction.nodeId;
      const node = nodeId ? topologyRef.current.nodesById[nodeId] : undefined;
      if (!node || !nodeId) {
        setNodePanel(null);
        setGraphPanel(null);
        return;
      }

      interactionSourceRef.current = nodeId;
      if (selectedRef.current.has(nodeId)) removeSelected(nodeId);
      else addSelected(nodeId);
      onNodeSelect?.(event as unknown as React.MouseEvent<SVGGElement>, node);
      if (event.shiftKey) {
        onNodeNavigate?.(event as unknown as React.MouseEvent<SVGGElement>, node);
      }
    };

    const handleDoubleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
      const node = pickNode(event.clientX, event.clientY);
      if (!node) return;
      interactionSourceRef.current = node.id.toString();
      if (selectedRef.current.has(node.id.toString())) clusterDeselect(node);
      else clusterSelect(node);
    };

    const handleWheel = useCallback(
      (event: WheelEvent) => {
        event.preventDefault();
        const local = getLocalPoint(event.clientX, event.clientY);
        const current = viewportRef.current;
        const worldX = (local.x - current.x) / current.scale;
        const worldY = (local.y - current.y) / current.scale;
        const nextScale = Math.max(
          MIN_SCALE,
          Math.min(MAX_SCALE, current.scale * Math.exp(-event.deltaY * 0.0012))
        );
        viewportRef.current = {
          scale: nextScale,
          x: local.x - worldX * nextScale,
          y: local.y - worldY * nextScale,
        };
        scheduleDraw();
      },
      [getLocalPoint, scheduleDraw]
    );

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.addEventListener("wheel", handleWheel, { passive: false });
      return () => canvas.removeEventListener("wheel", handleWheel);
    }, [handleWheel]);

    const handleContextMenu = (event: React.MouseEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      const node = pickNode(event.clientX, event.clientY);
      if (node) {
        setGraphPanel(null);
        setNodePanel({
          node,
          position: { x: event.clientX, y: event.clientY },
          onClose: () => setNodePanel(null),
        });
      } else {
        setNodePanel(null);
        setGraphPanel({
          position: { x: event.clientX, y: event.clientY },
          onClose: () => setGraphPanel(null),
        });
      }
    };

    return (
      <div
        ref={containerRef}
        className={`${styles.container} ${
          graphicsMode === "reduced" || visualMode === "static" ? styles.reducedEffects : ""
        }`}
      >
        {!topology.nodes.length && <div className={styles.empty}>Nothing here yet.</div>}
        {topology.nodes.length >= PREWARM_NODE_THRESHOLD && (
          <div
            className={`${styles.arranging} ${layoutReady ? styles.arrangingComplete : ""}`}
            role="status"
            aria-hidden={layoutReady}
          >
            <div className={styles.arrangingContent}>
              {graphicsMode === "full" && visualMode !== "static" && (
                <div className={styles.antLoader} aria-hidden="true">
                  <LangtonsAntLoader
                    cellSize={12}
                    stepsPerSecond={12}
                    numAnts={4}
                    fadeDuration={320}
                    cellAgeThreshold={1800}
                    cellAgeFadeDuration={900}
                  />
                </div>
              )}
              <span>Arranging constellation…</span>
            </div>
          </div>
        )}
        {nodePanel && (
          <NodePanel
            key={nodePanel.node.id.toString()}
            ref={nodePanelRef}
            {...nodePanel}
            onClusterSelect={clusterSelect}
            onClusterDeselect={clusterDeselect}
            onExploreSemantic={onExploreSemantic}
          />
        )}
        {graphPanel && (
          <GraphPanel
            ref={graphPanelRef}
            {...graphPanel}
            graph={graph}
            onTraceSelection={onTraceSelection}
            onMutationComplete={onMutationComplete}
          />
        )}
        <canvas
          ref={canvasRef}
          className={`${styles.canvas} ${layoutReady ? styles.layoutReady : styles.layoutPending}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            const nodeId = pointerRef.current?.nodeId;
            if (nodeId) {
              workerRef.current?.postMessage({
                type: "end_node_drag",
                payload: { id: nodeId },
              });
            }
            pointerRef.current = null;
            hoveredRef.current = undefined;
            styleRevisionRef.current += 1;
            scheduleDraw();
          }}
          onPointerLeave={() => {
            if (pointerRef.current) return;
            hoveredRef.current = undefined;
            styleRevisionRef.current += 1;
            scheduleDraw();
          }}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
        />
        <canvas
          ref={labelsRef}
          className={`${styles.labels} ${layoutReady ? styles.layoutReady : styles.layoutPending}`}
        />
      </div>
    );
  }
);

WebGLGraph.displayName = "WebGLGraph";

export default WebGLGraph;
