import Graph from "../../components/Graph/Index";
import { IGraph } from "../../declarations/graph";
import { useRef, useState } from "react";
import styles from "./Home.module.scss";
import { Grid, Textarea } from "@mantine/core";

const data: IGraph = {
  nodes: [
    { id: "A", content: "Start Node" },
    { id: "B", content: "Process Data" },
    { id: "C", content: "Validate Input" },
    { id: "D", content: "Transform Data" },
    { id: "E", content: "Load Data" },
    { id: "F", content: "Analyze Results" },
    { id: "G", content: "Generate Report" },
    { id: "H", content: "Send Notification" },
    { id: "I", content: "Archive Data" },
    { id: "J", content: "End Node" },
  ],
  edges: [
    { source: "A", target: "B" },
    { source: "B", target: "C" },
    { source: "C", target: "D" },
    { source: "D", target: "E" },
    { source: "E", target: "F" },
    { source: "F", target: "G" },
    { source: "G", target: "H" },
    { source: "H", target: "I" },
    { source: "I", target: "J" },
    { source: "J", target: "A" }, // Creating a loop back to the start node
    {
      source: "D",
      target: "H",
    },
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
      <UI
        addNode={(content) => {
          setLocalData((prevData) => ({
            ...prevData,
            nodes: [
              ...prevData.nodes,
              { id: `N${prevData.nodes.length + 1}`, content },
            ],
          }));
        }}
      />
    </div>
  );
}

type UIProps = {
  addNode: (content: string) => void;
};

function UI({ addNode }: UIProps) {
  return (
    <div className={styles.ui}>
      <Grid>
        <Grid.Col span={{ sm: 12 }}>
          <Textarea
            placeholder="Add a node"
            onKeyUp={(e) => {
              if (e.key === "Enter") {
                addNode(e.currentTarget.value);
                e.currentTarget.value = "";
              }
            }}
          />
        </Grid.Col>
      </Grid>
    </div>
  );
}
