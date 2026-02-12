import * as d3 from "d3";
import { useEffect, useRef } from "react";
import styles from "./Connections.module.scss";

const config: any = {
  nodes: [
    { id: "A", group: "group1" },
    { id: "B", group: "group1" },
    { id: "C", group: "group1" },
    { id: "D", group: "group2" },
    { id: "E", group: "group2" },
    { id: "F", group: "group3" },
    { id: "G", group: "group3" },
  ],
  links: [
    { source: "A", target: "G" },
    { source: "F", target: "C" },
    { source: "B", target: "C" },
    { source: "C", target: "E" },
  ],
  colors: {
    group1: "var(--mantine-color-blue-6)",
    group2: "var(--mantine-color-green-6)",
    group3: "var(--mantine-color-gray-6)",
  },
  simulation: {
    chargeStrength: -150,
    centerStrength: 0.1,
    linkDistance: 30,
  },
  dimensions: {
    width: 500,
    height: 300,
  },
  style: {
    nodeRadius: 10,
    nodeStrokeWidth: 1.5,
    linkStrokeWidth: 1.5,
    linkStrokeOpacity: 0.6,
  },
};

export default function Connections() {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const { width, height } = config.dimensions;

    const svg = d3
      .select(ref.current)
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", [-width / 2, -height / 2, width, height]);

    // Clear previous renders
    svg.selectAll("*").remove();

    const simulation = d3
      .forceSimulation(config.nodes)
      .force(
        "link",
        d3
          .forceLink(config.links)
          .id((d: any) => d.id)
          .distance(config.simulation.linkDistance)
      )
      .force("charge", d3.forceManyBody().strength(config.simulation.chargeStrength))
      .force("center", d3.forceCenter(0, 0).strength(config.simulation.centerStrength));

    const link = svg
      .append("g")
      .attr("stroke", "var(--mantine-color-gray-5)")
      .attr("stroke-opacity", config.style.linkStrokeOpacity)
      .selectAll("line")
      .data(config.links)
      .join("line")
      .attr("stroke-width", config.style.linkStrokeWidth);

    const node = svg
      .append("g")
      .attr("stroke", "var(--mantine-color-dark-9)")
      .attr("stroke-width", config.style.nodeStrokeWidth)
      .selectAll("circle")
      .data(config.nodes)
      .join("circle")
      .attr("r", config.style.nodeRadius)
      .attr("fill", (d: any) => config.colors[d.group]);

    node.append("title").text((d: any) => d.id);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);
    });

    return () => {
      simulation.stop();
    };
  }, []);

  return (
    <div className={styles.connections}>
      <svg ref={ref}></svg>
    </div>
  );
}
