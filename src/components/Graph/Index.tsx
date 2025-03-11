import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { IEdge, IGraph, INode } from "../../declarations/graph";
import * as d3 from "d3";
import styles from "./Index.module.scss";

type GraphProps = {
  graph: IGraph;
  width?: number; // Optional width
  height?: number; // Optional height
  onNodeClick: (event: any, node: INode) => void;
};

function Graph({ graph, width, height, onNodeClick }: GraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null); // Ref for the container
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 }); // State for dimensions

  // --- Force Simulation Parameters (easily adjustable) ---
  const forceStrength = -300; // Negative for repulsion
  const linkDistance = 124;
  const linkStrength = 0.2;
  const centerForceStrength = 0.4;

  // --- Styles
  const markerWidth = 10;
  const markerHeight = 10;
  const strokeWidth = 3.5;
  const nodeRadius = 56;
  const nodeStrokeWidth = 4;

  // --- Update dimensions on container resize ---
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    // Initial dimensions
    updateDimensions();

    // Listen for window resize (using ResizeObserver for better performance)
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, []);

  useLayoutEffect(() => {
    const currentWidth = width ?? dimensions.width;
    const currentHeight = height ?? dimensions.height;

    if (currentWidth === 0 || currentHeight === 0) {
      return; // Don't render if dimensions are 0
    }

    const svg = d3.select(svgRef.current);

    // --- Force Simulation Setup ---
    const simulation = d3
      .forceSimulation(graph.nodes as d3.SimulationNodeDatum[]) // Cast for type compatibility
      .force(
        "link",
        d3
          .forceLink(
            graph.edges as d3.SimulationLinkDatum<d3.SimulationNodeDatum>[],
          )
          .id((d: any) => d.id) // Important:  Tell D3 how to get node IDs from your data
          .distance(linkDistance)
          .strength(linkStrength),
      )
      .force("charge", d3.forceManyBody().strength(forceStrength))
      .force(
        "center",
        d3
          .forceCenter(currentWidth / 2, currentHeight / 2)
          .strength(centerForceStrength),
      )
      .alphaDecay(0.008); //Controls how quickly the simulation cools down.

    // --- Arrow Markers (Define once, outside the join) ---
    svg
      .append("defs")
      .selectAll("marker")
      .data(["arrowhead"]) // Unique ID for the marker
      .join("marker")
      .attr("id", String)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20.5) // Adjust to position the arrowhead relative to the line end
      .attr("refY", 0)
      .attr("markerWidth", markerWidth)
      .attr("markerHeight", markerHeight)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-2L5,0L0,2")
      .attr("fill", "var(--color-edges)");

    // --- Edges (Lines) ---
    const link = svg
      .selectAll(`.${styles.link}`) // Use class for easier selection/updates
      .data(graph.edges)
      .join("line")
      .attr("class", styles.link)
      .attr("stroke", "var(--color-edges)")
      .attr("stroke-width", strokeWidth)
      .attr("marker-end", "url(#arrowhead)");

    // --- Nodes (Circles and Text) ---
    const node = svg
      .selectAll(`.${styles.node}`) // Select by class
      .data(graph.nodes)
      .join("g")
      .attr("class", styles.node) // Apply the class to the group
      .call(
        d3
          .drag<SVGGElement, INode>() // Type arguments for d3.drag
          .subject(function (event: any, d: any) {
            return { x: event.x, y: event.y, ...d };
          })
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended) as any,
      );

    // Append the circle to the group
    node
      .append("circle")
      .attr("r", nodeRadius)
      .attr("fill", "var(--color-nodes)")
      .attr("stroke", "var(--color-nodes-stroke)")
      .attr("stroke-width", nodeStrokeWidth)
      .on("click", (event, d) => onNodeClick(event, d));

    // Append the text to the *same group*
    node
      .append("text")
      .attr("class", styles.nodeText)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .text((d) => d.content);

    // --- Update positions on each tick of the simulation ---
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      // **KEY CHANGE: Update the transform of the GROUP**
      node.attr("transform", (d: any) => `translate(${d.x}, ${d.y})`);
    });

    // --- Drag Handlers ---
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart(); //Reheat the simulation
      d.fx = d.x; //Fix the position
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0); //Let the simulation cool down
      d.fx = null; //Unfix the position, letting the simulation take over again
      d.fy = null;
    }

    // --- Cleanup ---
    return () => {
      simulation.stop(); // Stop the simulation when unmounting
      svg.selectAll("*").remove();
    };
  }, [
    graph,
    dimensions,
    width,
    height,
    onNodeClick,
    forceStrength,
    linkDistance,
    linkStrength,
    centerForceStrength,
    nodeRadius,
  ]); // Include relevant parameters in dependencies

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%" }}
      className={styles.container}
    >
      <svg
        ref={svgRef}
        width={width ?? dimensions.width}
        height={height ?? dimensions.height}
      />
    </div>
  );
}

export default Graph;
