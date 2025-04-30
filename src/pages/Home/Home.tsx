import Graph from "../../components/Graph/Graph";
import { IGraph } from "../../declarations/graph";
import { useEffect, useRef, useState } from "react";
import styles from "./Home.module.scss";
import useFetch from "../../hooks/useFetch";
import { IDBGraph } from "../../../app/database/models/ideas";
import { useNavigate } from "react-router";
import { GraphState } from "./GraphToolbar";
import { dbGraphToLocalGraph } from "../../utils/graph";
import { Group, Loader } from "@mantine/core";
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
          nodes={localData?.nodes || []}
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
          <Group>
            <Loader size="lg" />
          </Group>
        )}
      </div>
      <RightSidebar>
        {isLoaded && (
          <GraphState
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
