import { IGraphController } from "@domains/constellation/components/Graph/Graph";
import AdaptiveGraph from "@domains/constellation/components/Graph/AdaptiveGraph";
import { INode } from "@/declarations/graph";
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import styles from "./Constellation.module.scss";
import useFetch from "@core/hooks/useFetch";
import { useNavigate } from "react-router";
import ConstellationActions from "./ConstellationActions";
import ConstellationContext from "./ConstellationContext";
import { getNodeLink } from "@infrastructure/graph/utils";
import { fromGraphSnapshot } from "@infrastructure/graph/model";
import { Group, Loader } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import PageWrapper from "@core/design/layout/PageWrapper";
import LeftSidebar from "@core/design/components/Layout/Left";
import RightSidebar from "@core/design/components/Layout/Right";
import { IConstellationLoader, IGraphFilters } from "../../../../../app/services/Graph";
import { IGraphSnapshot } from "../../../../../shared/types/graph-snapshot";
import GraphLoader from "@core/design/components/Loading/GraphLoader";
import { useLandscape } from "@/contexts/LandscapeContext";
import { useGraph } from "@domains/constellation/contexts/GraphContext";
import { useSearch } from "@domains/discovery/contexts/SearchContext";
import Nav from "@core/design/components/Layout/Nav";
import TopBar from "@core/design/components/Layout/TopBar";
import ConstellationVisualModeMenu from "@domains/constellation/components/Graph/ConstellationVisualModeMenu";
import { useConstellationVisualMode } from "@domains/constellation/components/Graph/useConstellationVisualMode";
import { useSemanticNeighborhoodController } from "@domains/constellation/semantic";
import {
  buildGraphTrace,
  type GraphTraceOverlay,
} from "@domains/constellation/components/Graph/trace";

export default function GraphPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<IGraphController>(null);
  const [visualMode, setVisualMode] = useConstellationVisualMode();

  const {
    rabbitholes: {
      entered: { get: currentRabbithole },
    },
  } = useLandscape();

  const {
    global: {
      scope: { get: scope },
    },
  } = useSearch();

  const sharedModeActive = scope.showShared === true || scope.showFriends === true;
  const loader = useMemo<IConstellationLoader>(
    () => ({
      things: true,
      rabbitholes: true,
      tags: true,
      connections: true,
      inclusions: true,
      descriptions: true,
      references: true,
      friends: sharedModeActive,
      shares: sharedModeActive,
    }),
    [sharedModeActive]
  );

  const requestBody = useMemo(
    () => ({
      loader,
      filters: {
        rabbithole: currentRabbithole?.id.toString() || scope.rabbithole?.toString(),
        tags: scope.tags
          ? {
              set: scope.tags.set.map((tagId: string) => tagId.toString()),
              behavior: scope.tags.behavior,
            }
          : undefined,
        date: scope.date
          ? {
              createdAt: scope.date.createdAt
                ? {
                    after: scope.date.createdAt.after || "",
                    before: scope.date.createdAt.before || "",
                  }
                : undefined,
              updatedAt: scope.date.updatedAt
                ? {
                    after: scope.date.updatedAt.after || "",
                    before: scope.date.updatedAt.before || "",
                  }
                : undefined,
              viewedAt: scope.date.viewedAt
                ? {
                    after: scope.date.viewedAt.after || "",
                    before: scope.date.viewedAt.before || "",
                  }
                : undefined,
            }
          : undefined,
        showShared: sharedModeActive,
        showFriends: sharedModeActive,
      },
    }),
    [currentRabbithole?.id, loader, scope, sharedModeActive]
  );

  const {
    data: constellationData,
    load: reloadConstellation,
    loading: loadingConstellation,
  } = useFetch<{ loader: IConstellationLoader; filters: IGraphFilters }, IGraphSnapshot>({
    url: "/graph/snapshot",
    method: "POST",
    body: requestBody,
    dependencies: [currentRabbithole?.id, scope, loader],
    cancelPrevious: true,
  });

  const {
    focused: { set: setFocused },
    selected: { get: selected },
    highlighted: { set: setHighlighted },
  } = useGraph();
  const [traceOverlay, setTraceOverlay] = useState<GraphTraceOverlay>();

  useEffect(() => {
    reloadConstellation();
    setFocused(currentRabbithole?.id.toString() || "");
  }, [currentRabbithole?.id, reloadConstellation, scope, setFocused]);

  useEffect(() => {
    setIsNavigating(false);
  }, []);

  const graphData = useMemo(
    () => (constellationData ? fromGraphSnapshot(constellationData) : undefined),
    [constellationData]
  );

  const semanticNeighborhood = useSemanticNeighborhoodController({
    graph: graphData || { nodes: [], edges: [] },
    filters: requestBody.filters,
    limit: 12,
    threshold: 0.45,
    includeConnected: true,
  });
  const clearSemanticNeighborhood = semanticNeighborhood.clear;
  const replaceSemanticSource = semanticNeighborhood.replaceSource;
  const [semanticLensActive, setSemanticLensActive] = useState(false);

  const handleSemanticLensChange = useCallback(
    (active: boolean) => {
      setSemanticLensActive(active);
      if (!active) {
        clearSemanticNeighborhood();
        return;
      }

      const selectedSource = graphData?.nodes.find(
        (node) => selected.has(node.id.toString()) && replaceSemanticSource(node)
      );
      if (!selectedSource) clearSemanticNeighborhood();
    },
    [clearSemanticNeighborhood, graphData, replaceSemanticSource, selected]
  );

  const handleNodeSelect = useCallback(
    (_event: React.MouseEvent<SVGGElement> | React.TouchEvent<SVGGElement>, node: INode) => {
      if (semanticLensActive) replaceSemanticSource(node);
    },
    [replaceSemanticSource, semanticLensActive]
  );

  const handleExploreSemantic = useCallback(
    (node: INode) => {
      setSemanticLensActive(true);
      setTraceOverlay(undefined);
      replaceSemanticSource(node);
    },
    [replaceSemanticSource]
  );

  const handleTraceSelection = useCallback(() => {
    if (!graphData) return;
    const trace = buildGraphTrace(graphData, selected);
    setTraceOverlay(trace);
    setSemanticLensActive(false);
    clearSemanticNeighborhood();
    setHighlighted(trace.nodeIds);
    if (trace.edgeIds.length === 0) {
      showNotification({
        title: "No connecting path found",
        message: "The selected nodes are not connected in the current landscape.",
        color: "yellow",
      });
    } else if (trace.unreachableNodeIds.length > 0) {
      showNotification({
        title: "Partial trace",
        message: `${trace.unreachableNodeIds.length} selected node${trace.unreachableNodeIds.length === 1 ? " is" : "s are"} disconnected from the traced path.`,
        color: "yellow",
      });
    }
  }, [clearSemanticNeighborhood, graphData, selected, setHighlighted]);

  const handleClearSelection = useCallback(() => {
    if (traceOverlay) setHighlighted([]);
    setTraceOverlay(undefined);
    setSemanticLensActive(false);
    clearSemanticNeighborhood();
  }, [clearSemanticNeighborhood, setHighlighted, traceOverlay]);

  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleNodeNavigate = useCallback(
    (event: React.MouseEvent<SVGGElement> | React.TouchEvent<SVGGElement>, node: INode) => {
      setIsNavigating(true);
      const link = getNodeLink(node);
      if (!link) {
        return;
      }
      navigate(link);
    },
    [navigate]
  );

  const isLoading = !graphData;

  return (
    <PageWrapper>
      <TopBar />
      <LeftSidebar
        topLevel={{
          open: <ConstellationVisualModeMenu value={visualMode} onChange={setVisualMode} />,
          hovering: <ConstellationVisualModeMenu value={visualMode} onChange={setVisualMode} />,
          collapsed: (
            <ConstellationVisualModeMenu
              value={visualMode}
              onChange={setVisualMode}
              position="right-start"
            />
          ),
        }}
      >
        <LeftSidebar.Open>
          {!!graphData && (
            <ConstellationContext
              graph={graphData}
              semanticLensActive={semanticLensActive}
              semanticUnavailableCount={semanticNeighborhood.overlay.unavailableNodeIds.length}
              landscapeLoading={loadingConstellation}
              onSemanticLensChange={handleSemanticLensChange}
              onExploreSemantic={handleExploreSemantic}
              onTraceSelection={handleTraceSelection}
              onClearSelection={handleClearSelection}
              onMutationComplete={reloadConstellation}
            />
          )}
        </LeftSidebar.Open>
      </LeftSidebar>
      <div ref={containerRef} className={styles.container}>
        {isLoading ? (
          <Group align="center" justify="center" h="100vh" mt="xl">
            <GraphLoader />
          </Group>
        ) : (
          <AdaptiveGraph
            ref={graphRef}
            graph={graphData} // graphData is guaranteed to exist here
            onNodeNavigate={handleNodeNavigate}
            onNodeSelect={handleNodeSelect}
            isNavigating={isNavigating}
            visualMode={visualMode}
            semanticOverlay={semanticNeighborhood.overlay}
            traceOverlay={traceOverlay}
            onTraceSelection={handleTraceSelection}
            onMutationComplete={reloadConstellation}
            onExploreSemantic={handleExploreSemantic}
          />
        )}
      </div>
      <Nav />
      <RightSidebar>
        <RightSidebar.Open>
          {loadingConstellation && <Loader size="sm" color="gray" />}
          {!!graphData && <ConstellationActions graphData={graphData} />}
        </RightSidebar.Open>
      </RightSidebar>
    </PageWrapper>
  );
}
