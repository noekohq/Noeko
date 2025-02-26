import { useEffect, useRef, useState } from "react";
import { IEdge, IGraph, INode } from "../declarations/graph";
import * as d3 from "d3";

type GraphProps = {
  graph: {
    nodes: INode[];
    edges: IEdge[];
  };
  width: number;
  height: number;
  onNodeClick: (event: any, node: INode) => void;
};

function Graph({ graph, width, height, onNodeClick }: GraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [localData, setLocalData] = useState<IGraph>(graph);

  useEffect(() => {
    const svg = d3.select(svgRef.current);

    // --- Arrow Markers ---
    svg
      .selectAll("line")
      .data(graph.edges)
      .join("line")
      .attr("x1", (d) => graph.nodes.find((n) => n.id === d.source)?.x || 0)
      .attr("y2", (d) => graph.nodes.find((n) => n.id === d.source)?.y || 0)
      .attr("x2", (d) => graph.nodes.find((n) => n.id === d.target)?.x || 0)
      .attr("y2", (d) => graph.nodes.find((n) => n.id === d.target)?.y || 0)
      .attr("stroke", "purple");

    svg
      .selectAll("circle")
      .data(graph.nodes)
      .join("circle")
      .attr("cx", (d) => d.x || 0)
      .attr("cy", (d) => d.y || 0)
      .attr("r", 10)
      .attr("fill", "skyblue")
      .on("click", (event, d) => onNodeClick(event, d));

    return () => {
      svg.selectAll("*").remove();
    };
  }, [localData, width, height, onNodeClick]); //Dependencies

  useEffect(() => {
    setLocalData(graph);
  }, [graph]);

  return <svg ref={svgRef} width={width} height={height}></svg>;
}

export default Graph;
