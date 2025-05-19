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

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: graphData, load: reloadGraph } = useFetch<undefined, IDBGraph>({
    url: "/graph",
    runOnMount: true,
  });

  const [localData, setLocalData] = useState<IGraph | null>(null);
  useEffect(() => {
    if (graphData) {
      setLocalData(dbGraphToLocalGraph(graphData));
    }
  }, [graphData]);

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
                  navigate(`/idea/${n.id}`);
                }
                if (n.type === "file") {
                  navigate(`/file/${n.id}`);
                }
              }}
            />
          </>
        ) : (
          <Group align="center" justify="center" h="100vh">
            <Loader size="sm" />
            <Text c="dimmed">Loading your graph...</Text>
          </Group>
        )}
      </div>
      <RightSidebar openOnShortcut={[{ key: "/" }]}>
        {isLoaded && (
          <GraphToolbar
            nodes={localData.nodes}
            reloadGraph={async () => {
              reloadGraph();
            }}
            flags={graphData.flags}
          />
        )}
      </RightSidebar>
    </PageWrapper>
  );
}
