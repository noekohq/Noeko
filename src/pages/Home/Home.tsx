import Graph from "../../components/Graph/Graph";
import { IGraph } from "../../declarations/graph";
import { useEffect, useRef, useState } from "react";
import styles from "./Home.module.scss";
import useFetch from "../../hooks/useFetch";
import { IDBGraph } from "../../../app/database/models/ideas";
import { useNavigate } from "react-router";
import UI from "./UI";
import { dbGraphToLocalGraph } from "../../utils/graph";
import { Group, Loader } from "@mantine/core";

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: graphData, load: reloadGraph } = useFetch<undefined, IDBGraph>({
    url: "/graph",
    runOnMount: true,
  });

  console.log("Graph data: ", graphData);

  const [localData, setLocalData] = useState<IGraph | null>(null);
  useEffect(() => {
    if (graphData) {
      setLocalData(dbGraphToLocalGraph(graphData));
    }
  }, [graphData]);

  const navigate = useNavigate();

  return (
    <div ref={containerRef} className={styles.container}>
      {!!localData && graphData ? (
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
          <UI
            nodes={localData.nodes}
            reloadGraph={async () => {
              reloadGraph();
            }}
            flags={graphData.flags}
          />
        </>
      ) : (
        <Group>
          <Loader size="lg" />
        </Group>
      )}
    </div>
  );
}
