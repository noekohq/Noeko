import Graph, { IGraphController } from "../../components/Graph/Graph";
import { INode } from "../../declarations/graph";
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import styles from "./Constellation.module.scss";
import useFetch from "../../hooks/useFetch";
import { useNavigate } from "react-router";
import ConstellationActions from "./ConstellationActions";
import ConstellationContext from "./ConstellationContext";
import { fromConstellation, getNodeLink } from "../../utils/graph";
import { Group, Loader, Text } from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import {
  IConstellationLoader,
  IGraphFilters,
  ILoadedConstellation,
} from "../../../app/services/Graph";
import GraphLoader from "../../components/Utils/Loading/GraphLoader";
import { useLandscape } from "../../contexts/LandscapeContext";
import { useGraph } from "../../contexts/GraphContext";
import { useSearch } from "../../contexts/SearchContext";
import Nav from "../../components/UI/Layout/Nav";
import TopBar from "../../components/UI/Layout/TopBar";

export default function GraphPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<IGraphController>(null);

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

  const {
    data: constellationData,
    load: reloadConstellation,
    loading: loadingConstellation,
  } = useFetch<
    { loader: IConstellationLoader; filters: IGraphFilters },
    ILoadedConstellation
  >({
    url: "/graph",
    method: "POST",
    body: {
      loader: {
        things: true,
        rabbitholes: true,
        tags: true,
        connections: true,
        inclusions: true,
        descriptions: true,
        references: true,
        friends: !!scope.showFriends,
        shares: !!scope.showFriends,
      },
      filters: {
        rabbithole:
          currentRabbithole?.id.toString() || scope.rabbithole?.toString(),
        tags: scope.tags
          ? {
              set: scope.tags.set.map((s) => s.toString()),
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
        showShared: scope.showShared,
        showFriends: scope.showFriends,
      },
    },
    dependencies: [currentRabbithole?.id, scope],
    onFinally: () => {
      graphRef.current?.reset();
    },
  });

  const {
    focused: { set: setFocused },
  } = useGraph();

  useEffect(() => {
    reloadConstellation();
    setFocused(currentRabbithole?.id.toString() || "");
  }, [currentRabbithole, scope]);

  useEffect(() => {
    setIsNavigating(false);
  }, []);

  const graphData = useMemo(
    () =>
      constellationData ? fromConstellation(constellationData) : undefined,
    [constellationData],
  );

  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleNodeNavigate = useCallback(
    (
      event: React.MouseEvent<SVGGElement> | React.TouchEvent<SVGGElement>,
      node: INode,
    ) => {
      setIsNavigating(true);
      const link = getNodeLink(node);
      if (!link) {
        return;
      }
      navigate(link);
    },
    [navigate],
  );

  const isLoading = loadingConstellation || !graphData;

  return (
    <PageWrapper>
      <TopBar />
      <LeftSidebar>
        <LeftSidebar.Open>
          {!!graphData && (
            <ConstellationContext
              graph={graphData}
              reloadGraph={async () => {
                reloadConstellation();
              }}
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
          <Graph
            ref={graphRef}
            graph={graphData} // graphData is guaranteed to exist here
            onNodeNavigate={handleNodeNavigate}
            isNavigating={isNavigating}
          />
        )}
      </div>
      <Nav />
      <RightSidebar>
        <RightSidebar.Open>
          {isLoading && <Loader size="sm" color="gray" />}
          {!!graphData && <ConstellationActions graphData={graphData} />}
        </RightSidebar.Open>
      </RightSidebar>
    </PageWrapper>
  );
}
