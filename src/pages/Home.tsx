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
import { Link } from "react-router";
import Graph from "../components/Graph";
import { IGraph } from "../declarations/graph";
import { useRef, useState } from "react";

const data: IGraph = {
  nodes: [
    { id: "A", content: "I am A", x: 50, y: 50 },
    { id: "B", content: "I am B", x: 150, y: 100 },
    { id: "C", content: "I am C", x: 100, y: 200 },
    { id: "D", content: "I am D", x: 250, y: 150 },
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

  return (
    <Container
      ref={containerRef}
      style={{
        height: "100vh",
      }}
    >
      <Graph
        graph={localData}
        width={containerRef.current?.clientWidth || 0}
        height={containerRef.current?.clientHeight || 0}
        onNodeClick={(e, n) => {
          console.log("clicked node: ", e, n);
        }}
      />
    </Container>
  );
}
