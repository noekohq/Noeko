import Graph from "../../components/Graph/Graph";
import { IGraph } from "../../declarations/graph";
import { useRef, useState } from "react";
import styles from "./Home.module.scss";
import useFetch from "../../hooks/useFetch";
import { IDBGraph } from "../../../app/database/models/idea";
import { useNavigate } from "react-router";
import UI from "./UI";

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: graphData, load: reloadGraph } = useFetch<undefined, IDBGraph>({
    url: "/graph",
    runOnMount: true,
  });

  const localData: IGraph = {
    nodes: graphData
      ? graphData?.ideas.map((n) => {
          return {
            ...n,
            id: n.id,
            title: n.title,
            content: n.content,
          };
        })
      : [],
    edges: graphData
      ? graphData.edges.map((e) => {
          return {
            ...e,
            id: e.id,
            source: e.in,
            target: e.out,
          };
        })
      : [],
  };

  const navigate = useNavigate();

  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // const { data: similarIdeas } = useFetch<undefined, IIdea[]>({
  //   url: `/graph/ideas/${selectedNode}/similar`,
  //   method: "GET",
  //   runOnDependencies: [selectedNode],
  // });

  console.log("Selected: ", selectedNode);

  return (
    <div ref={containerRef} className={styles.container}>
      <Graph
        graph={localData}
        onNodeNavigate={(e, n) => {
          navigate(`/idea/${n.id}`);
        }}
        onNodeSelect={(e, n) => {}}
        onNodeHover={(e, n) => {}}
        onNodeHoverOut={(e, n) => {}}
      />
      <UI nodes={localData.nodes} reloadGraph={reloadGraph} />
    </div>
  );
}
