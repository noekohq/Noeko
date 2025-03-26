import { Ref, useEffect, useLayoutEffect, useRef, useState } from "react";
import { IGraph, INode } from "../../declarations/graph";
import * as d3 from "d3";
import styles from "./Graph.module.scss";
import { Flex, Text } from "@mantine/core";

type GraphProps = {
  graph: IGraph;
  width?: number;
  height?: number;
  onNodeClick: (event: any, node: INode) => void;
  onNodeHover: (event: any, node: INode) => void;
  onNodeHoverOut: (event: any, node: INode) => void;
};

function Graph({
  graph,
  width,
  height,
  onNodeClick,
  onNodeHover,
  onNodeHoverOut,
}: GraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const zoomRef = useRef<d3.ZoomBehavior<any, any> | null>(null);

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
    const simulationConfig = {
      forceStrength: -100,
      linkDistance: 100,
      linkStrength: 0.1,
      centerForceStrength: 0.1,
      alphaDecay: 0.0228,
    };
    const simulation = d3
      .forceSimulation(graph.nodes as d3.SimulationNodeDatum[])
      .force(
        "link",
        d3
          .forceLink(
            graph.edges as d3.SimulationLinkDatum<d3.SimulationNodeDatum>[],
          )
          .id((d: any) => d.id)
          .distance(simulationConfig.linkDistance)
          .strength(simulationConfig.linkStrength),
      )
      .force(
        "charge",
        d3.forceManyBody().strength(simulationConfig.forceStrength),
      )
      .force(
        "center",
        d3
          .forceCenter(currentWidth / 2, currentHeight / 2)
          .strength(simulationConfig.centerForceStrength),
      )
      .alphaDecay(simulationConfig.alphaDecay);

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

    const g = svg.append("g").attr("class", "everything");

    // --- Arrow Markers ---

    const builderProps: GraphBuilderProps = {
      graph,
      parent: g,
      events: {
        drag: {
          start: dragstarted,
          drag: dragged,
          end: dragended,
        },
      },
      handlers: {
        onNodeClick,
        onNodeHover,
        onNodeHoverOut,
      },
    };

    const defs = Graph.DefBuilder(builderProps);
    const link = Graph.EdgeBuilder(builderProps);
    const node = Graph.NodeBuilder(builderProps);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x}, ${d.y})`);
    });

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
  }, [graph, dimensions, width, height, onNodeClick]);

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

type GraphBuilderProps = {
  graph: IGraph;
  parent: d3.Selection<SVGGElement, unknown, null, undefined>;
  events: {
    drag: {
      start: (event: any, d: any) => void;
      drag: (event: any, d: any) => void;
      end: (event: any, d: any) => void;
    };
  };
  handlers: {
    onNodeClick: (e: React.MouseEvent<SVGElement>, node: INode) => void;
    onNodeHover: (e: React.MouseEvent<SVGElement>, node: INode) => void;
    onNodeHoverOut: (e: React.MouseEvent<SVGElement>, node: INode) => void;
  };
};

Graph.DefBuilder = function ({ parent, graph }: GraphBuilderProps) {
  const defs = parent.append("defs");

  const gradientOptions = {
    innerColor: "var(--color-nodes)",
    outerColor: "var(--color-background)",
    opacityInner: 0.8,
    opacityOuter: 0.2,
  };

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
    .attr("offset", "40%")
    .attr("stop-color", gradientOptions.innerColor)
    .attr("stop-opacity", gradientOptions.opacityInner);

  gradients // Outer color stop
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", gradientOptions.outerColor)
    .attr("stop-opacity", gradientOptions.opacityOuter);

  const markerOptions = {
    width: 10,
    height: 10,
    refX: 20.5,
    refY: 0,
    orient: "auto",
    fill: "var(--color-edges)",
  };

  defs
    .selectAll("marker")
    .data(["arrowhead"])
    .join("marker")
    .attr("id", String)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", markerOptions.refX)
    .attr("refY", markerOptions.refY)
    .attr("markerWidth", markerOptions.width)
    .attr("markerHeight", markerOptions.height)
    .attr("orient", markerOptions.orient)
    .append("path")
    .attr("d", "M0,-2L5,0L0,2")
    .attr("fill", markerOptions.fill);
};

Graph.NodeBuilder = function ({
  graph,
  parent,
  events,
  handlers,
}: GraphBuilderProps) {
  const { drag } = events;
  const { onNodeClick, onNodeHover, onNodeHoverOut } = handlers;
  const options = {
    radius: 24,
    textOffset: 8,
  };

  const handleNodeClick = (event: React.MouseEvent<SVGElement>, d: any) => {
    onNodeClick(event, d);
    if (event.shiftKey) {
      const target = event.currentTarget;
      if (!target) return;
      target.style.fill = "red";
    }
  };

  const handleNodeHover = (event: React.MouseEvent<SVGElement>, d: any) => {
    onNodeHover(event, d);
  };

  const handleNodeHoverOut = (event: React.MouseEvent<SVGElement>, d: any) => {
    onNodeHoverOut(event, d);
  };

  const node = parent
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
        .on("start", drag.start)
        .on("drag", drag.drag)
        .on("end", drag.end) as any,
    );

  node
    .append("circle")
    .attr("r", options.radius)
    .attr("fill", (d) => `url(#gradient-${d.id})`) // **CRITICAL: Refer to the gradient**
    .on("click", handleNodeClick)
    .on("mouseenter", handleNodeHover)
    .on("mouseleave", handleNodeHoverOut);

  node
    .append("text")
    .attr("class", styles.nodeText)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "hanging")
    .attr("y", options.radius + options.textOffset)
    .text((d) => d.title);

  return node;
};

Graph.EdgeBuilder = function ({ graph, parent }: GraphBuilderProps) {
  const options = {
    strokeWidth: 2,
  };

  const link = parent
    .selectAll(`.${styles.link}`)
    .data(graph.edges)
    .join("line")
    .attr("class", styles.link)
    .attr("stroke", "var(--color-edges)")
    .attr("stroke-width", options.strokeWidth)
    .attr("marker-end", "url(#arrowhead)");

  return link;
};
