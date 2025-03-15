import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { IGraph, INode } from "../../declarations/graph";
import * as d3 from "d3";
import styles from "./Index.module.scss";
import { Flex, Text } from "@mantine/core";

type GraphProps = {
  graph: IGraph;
  width?: number;
  height?: number;
  onNodeClick: (event: any, node: INode) => void;
};

function Graph({ graph, width, height, onNodeClick }: GraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const zoomRef = useRef<d3.ZoomBehavior<any, any> | null>(null);

  // --- Force Simulation Parameters ---
  const forceStrength = -150;
  const linkDistance = 124;
  const linkStrength = 0.2;
  const centerForceStrength = 1.25;

  // --- Styles ---
  const markerWidth = 10;
  const markerHeight = 10;
  const strokeWidth = 1;
  const nodeRadius = 56;
  const nodeStrokeWidth = 1.5;

  // --- Gradient Parameters ---
  const gradientInnerColor = "var(--color-nodes-inner)"; // Tunable: Inner color of the gradient
  const gradientOuterColor = "var(--color-nodes-outer)"; // Tunable: Outer color (defaults to node color)
  const gradientOpacityInner = 0.25; // Tunable: Opacity of the gradient
  const gradientOpacityOuter = 1; // Tunable: Opacity of the gradient

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();

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
      return;
    }

    const svg = d3.select(svgRef.current);
    const simulation = d3
      .forceSimulation(graph.nodes as d3.SimulationNodeDatum[])
      .force(
        "link",
        d3
          .forceLink(
            graph.edges as d3.SimulationLinkDatum<d3.SimulationNodeDatum>[],
          )
          .id((d: any) => d.id)
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
      .alphaDecay(0.008);

    const g = svg.append("g").attr("class", "everything");

    // --- Arrow Markers ---
    g.append("defs")
      .selectAll("marker")
      .data(["arrowhead"])
      .join("marker")
      .attr("id", String)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20.5)
      .attr("refY", 0)
      .attr("markerWidth", markerWidth)
      .attr("markerHeight", markerHeight)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-2L5,0L0,2")
      .attr("fill", "var(--color-edges)");

    // --- Radial Gradients (Define *once* per node, inside the 'defs') ---
    const defs = g.append("defs");

    const gradients = defs
      .selectAll("radialGradient")
      .data(graph.nodes)
      .join("radialGradient")
      .attr("id", (d) => `gradient-${d.id}`) // **CRITICAL: Unique ID per gradient**
      .attr("cx", "50%") // Center of the gradient (relative to the circle)
      .attr("cy", "50%")
      .attr("r", "50%") // Radius of the gradient
      .attr("fx", "50%") // Focal point (can be different for interesting effects)
      .attr("fy", "50%");

    gradients // Inner color stop
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", gradientInnerColor)
      .attr("stop-opacity", gradientOpacityInner);

    gradients // Outer color stop
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", gradientOuterColor)
      .attr("stop-opacity", gradientOpacityOuter);

    // --- Edges ---
    const link = g
      .selectAll(`.${styles.link}`)
      .data(graph.edges)
      .join("line")
      .attr("class", styles.link)
      .attr("stroke", "var(--color-edges)")
      .attr("stroke-width", strokeWidth)
      .attr("marker-end", "url(#arrowhead)");

    // --- Nodes ---
    const node = g
      .selectAll(`.${styles.node}`)
      .data(graph.nodes)
      .join("g")
      .attr("class", styles.node)
      .call(
        d3
          .drag<SVGGElement, INode>()
          .subject(function (event: any, d: any) {
            return { x: event.x, y: event.y, ...d };
          })
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended) as any,
      );

    // --- Use the gradient for the fill ---
    node
      .append("circle")
      .attr("r", nodeRadius)
      .attr("fill", (d) => `url(#gradient-${d.id})`) // **CRITICAL: Refer to the gradient**
      // .attr("stroke", "var(--color-nodes-stroke)")
      // .attr("stroke-width", nodeStrokeWidth)
      .on("click", (event, d) => onNodeClick(event, d));

    node
      .append("text")
      .attr("class", styles.nodeText)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .text((d) => d.title);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x}, ${d.y})`);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    const zoomed = (event: d3.D3ZoomEvent<any, any>) => {
      g.attr("transform", event.transform as any);
    };

    const zoom: d3.ZoomBehavior<any, any> = d3
      .zoom()
      .scaleExtent([0.1, 8])
      .on("zoom", zoomed);
    zoomRef.current = zoom;
    svg.call(zoom as any);

    return () => {
      simulation.stop();
      svg.selectAll("*").remove();
      if (zoomRef.current) {
        svg.on(".zoom", null);
      }
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
    gradientInnerColor,
    gradientOuterColor,
    gradientOpacityInner,
    gradientOpacityOuter, // Add gradient parameters to dependencies
  ]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%" }}
      className={styles.container}
    >
      {graph.nodes.length > 0 ? (
        <svg
          ref={svgRef}
          width={width ?? dimensions.width}
          height={height ?? dimensions.height}
        />
      ) : (
        <Flex
          align="center"
          justify="center"
          style={{
            height: "100%",
          }}
        >
          <Text>No data available. Add some!</Text>
        </Flex>
      )}
    </div>
  );
}

export default Graph;
