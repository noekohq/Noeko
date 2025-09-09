import Graph from "../../components/Graph/Graph";
import { IGraph, INode } from "../../declarations/graph";
import React, { useEffect, useRef, useState, useCallback } from "react";
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
import LangtonsAntLoader from "../../components/Utils/Loading/AntLoader";
import StatusBar from "../../components/UI/Layout/Bottom";
import {
  IConstellationLoader,
  ILoadedConstellation,
} from "../../../app/services/Graph";

export default function GraphPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  const graphIsLoading = useRef(false);
  const { data: constellation, load: reloadConstellation } = useFetch<
    { loader: IConstellationLoader },
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
      },
    },
    onFinally: () => {
      graphIsLoading.current = false;
    },
  });

  useEffect(() => {
    if (graphIsLoading.current === false) {
      graphIsLoading.current = true;
      reloadConstellation();
    }
  }, []);

  useEffect(() => {
    setIsNavigating(false);
  }, []);

  const graphData = constellation
    ? fromConstellation(constellation)
    : undefined;

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

  const isLoaded = !!constellation && graphData;

  return (
    <PageWrapper>
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
        {isLoaded ? (
          <>
            <Graph
              graph={graphData}
              onNodeNavigate={handleNodeNavigate}
              isNavigating={isNavigating}
            />
          </>
        ) : (
          <Group align="center" justify="center" h="100vh" mt="xl">
            <LangtonsAntLoader withOverlay />
            {/* <Loader size="sm" />
            <Text c="dimmed">
              Loading your graph... This could take a little while.
            </Text> */}
          </Group>
        )}
      </div>
      <StatusBar />
      <RightSidebar>
        <RightSidebar.Open>
          {!isLoaded && <Loader size="sm" />}
          {isLoaded && !!graphData && (
            <ConstellationActions graphData={graphData} />
          )}
        </RightSidebar.Open>
      </RightSidebar>
    </PageWrapper>
  );
}
