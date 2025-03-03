import {
  Button,
  Code,
  Container,
  Flex,
  Grid,
  Group,
  Text,
  Title,
} from "@mantine/core";
import Graph from "../../components/Graph/Index";
import { IGraph } from "../../declarations/graph";
import { useRef, useState } from "react";
import styles from "./Home.module.scss";

const data: IGraph = {
  nodes: [
    { id: "A", content: "I am A" },
    { id: "B", content: "I am B" },
    { id: "C", content: "I am C" },
    { id: "D", content: "I am D" },
    { id: "Z", content: "I am Z" },
  ],
  edges: [
    { source: "A", target: "B" },
    { source: "B", target: "C" },
    { source: "C", target: "D" },
    { source: "D", target: "A" },
  ],
};

export default function Home() {
  const [localData, setLocalData] = useState(data);

  const containerRef = useRef<HTMLDivElement>(null);

  console.log("Container ref: ", containerRef.current);

  return (
    <div ref={containerRef} className={styles.container}>
      <Graph
        graph={localData}
        onNodeClick={(e, n) => {
          console.log("clicked node: ", e, n);
        }}
      />
    </div>
  );
}
