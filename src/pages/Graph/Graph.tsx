import Graph from "../../components/Graph/Graph";
import { IGraph, INode } from "../../declarations/graph";
import React, { useEffect, useRef, useState, useCallback } from "react";
import styles from "./Graph.module.scss";
import useFetch from "../../hooks/useFetch";
import { IDBGraph } from "../../../app/database/models/ideas";
import { useNavigate } from "react-router";
import { GraphToolbar } from "./GraphToolbar";
import { dbGraphToLocalGraph } from "../../utils/graph";
import { Group, Loader, Text } from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/LeftSidebar";
import RightSidebar from "../../components/UI/RightSidebar";
import { GraphNavigation } from "./GraphNavigation";
import LangtonsAntLoader from "../../components/Utils/Loading/AntLoader";

export default function GraphPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  const graphIsLoading = useRef(false);
  const { data: graphData, load: reloadGraph } = useFetch<undefined, IDBGraph>({
    url: "/graph",
    onFinally: () => {
      graphIsLoading.current = false;
    },
  });

  useEffect(() => {
    if (graphIsLoading.current === false) {
      graphIsLoading.current = true;
      reloadGraph();
    }
  }, []);

  useEffect(() => {
    setIsNavigating(false); // Reset on mount/page load
  }, []);

  const localData = graphData ? dbGraphToLocalGraph(graphData) : undefined;

  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleNodeNavigate = useCallback(
    (
      event: React.MouseEvent<SVGGElement> | React.TouchEvent<SVGGElement>,
      node: INode,
    ) => {
      setIsNavigating(true);
      if (node.type === "idea") {
        navigate(`/idea/${node.id.toString()}`);
      }
      if (node.type === "file") {
        navigate(`/file/${node.id.toString()}`);
      }
      if (node.type === "tag") {
        navigate(`/tags/${node.id.toString()}`); // Maintained original navigation target for 'tag'
      }
    },
    [navigate],
  );

  const isLoaded = !!localData && graphData;

  return (
    <PageWrapper>
      <LeftSidebar>
        {localData && (
          <GraphNavigation
            graph={localData}
            reloadGraph={async () => {
              reloadGraph();
            }}
            flags={graphData?.flags}
          />
        )}
      </LeftSidebar>
      <div ref={containerRef} className={styles.container}>
        {isLoaded ? (
          <>
            <Graph
              graph={localData}
              onNodeNavigate={handleNodeNavigate}
              isNavigating={isNavigating}
            />
          </>
        ) : (
          <Group align="center" justify="center" h="100vh" mt="md">
            <Text c="dimmed">
              Loading your graph... This could take a little while :)
            </Text>
            <LangtonsAntLoader withOverlay />
            {/* <Loader size="sm" />
            <Text c="dimmed">
              Loading your graph... This could take a little while.
            </Text> */}
          </Group>
        )}
      </div>
      <RightSidebar openOnShortcut={[{ key: "/" }]} omitDefaults>
        {!isLoaded && <Loader size="sm" />}
        {isLoaded && (
          <GraphToolbar nodes={localData.nodes} flags={graphData.flags} />
        )}
      </RightSidebar>
    </PageWrapper>
  );
}
