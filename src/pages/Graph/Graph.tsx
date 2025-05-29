import Graph from "../../components/Graph/Graph";
import { IGraph } from "../../declarations/graph";
import { useEffect, useRef, useState } from "react";
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

  const localData = graphData ? dbGraphToLocalGraph(graphData) : undefined;

  const navigate = useNavigate();

  const isLoaded = !!localData && graphData;

  return (
    <PageWrapper>
      <LeftSidebar>
        <GraphNavigation
          graph={localData}
          reloadGraph={async () => {
            reloadGraph();
          }}
          flags={graphData?.flags}
        />
      </LeftSidebar>
      <div ref={containerRef} className={styles.container}>
        {isLoaded ? (
          <>
            <Graph
              graph={localData}
              onNodeNavigate={(e, n) => {
                if (n.type === "idea") {
                  navigate(`/idea/${n.id.toString()}`);
                }
                if (n.type === "file") {
                  navigate(`/file/${n.id.toString()}`);
                }
                if (n.type === "tag") {
                  navigate(`/file/${n.id.toString()}`);
                }
              }}
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
