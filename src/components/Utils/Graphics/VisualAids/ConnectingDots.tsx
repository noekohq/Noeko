import { useEffect, useRef, useState, type FC } from "react";
import * as d3 from "d3";
import styles from "./ConnectingDots.module.scss";

const SIMULATION_CONFIG = {
  growth: {
    initialNodes: 2,
    maxNodes: 10,
    addNodeInterval: 1000,
    linkNodeDelay: 500,
    animateLinksOnly: false,
  },

  physics: {
    chargeStrength: -300,
    linkDistance: 100,
    linkStrength: 0.15,
    collideRadius: 10,
    zoom: 2,
  },

  style: {
    nodeRadius: 15,
    nodeFillColor: "var(--mantine-color-dark-9)",
    nodeStrokeColor: "var(--mantine-color-blue-6)",
    nodeStrokeWidth: 3,
    glowStdDeviation: 0,
    linkStrokeColor: "var(--mantine-color-dark-7)",
    linkStrokeWidth: 1,
    transitionDuration: 1000,
  },
};

// --- Type Definitions ---
interface Node extends d3.SimulationNodeDatum {
  id: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: number | Node;
  target: number | Node;
}

// --- Component ---
const ConnectingDots: FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);
  const nextNodeId = useRef<number>(SIMULATION_CONFIG.growth.initialNodes);
  const [nodes, setNodes] = useState<Node[]>(
    Array.from({ length: SIMULATION_CONFIG.growth.initialNodes }, (_, i) => ({
      id: i,
    })),
  );
  const [links, setLinks] = useState<Link[]>([]);

  // Ref to get current nodes inside interval
  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    if (!svg.node()) return;

    const width = svg.node()?.getBoundingClientRect().width;
    const height = svg.node()?.getBoundingClientRect().height;

    if (!width || !height) return;

    const viewBox = [
      -width / SIMULATION_CONFIG.physics.zoom,
      -height / SIMULATION_CONFIG.physics.zoom,
      width * SIMULATION_CONFIG.physics.zoom,
      height * SIMULATION_CONFIG.physics.zoom,
    ];
    svg.attr("viewBox", viewBox);

    const g = svg.append("g");
    const linkGroup = g.append("g").attr("class", "links");
    const nodeGroup = g.append("g").attr("class", "nodes");
    const defs = svg.append("defs");
    const filter = defs.append("filter").attr("id", "glow");

    filter
      .append("feGaussianBlur")
      .attr("stdDeviation", SIMULATION_CONFIG.style.glowStdDeviation)
      .attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    simulationRef.current = d3
      .forceSimulation<Node, Link>()
      .force(
        "link",
        d3
          .forceLink<Node, Link>()
          .id((d) => d.id)
          .distance(SIMULATION_CONFIG.physics.linkDistance)
          .strength(SIMULATION_CONFIG.physics.linkStrength),
      )
      .force(
        "charge",
        d3.forceManyBody().strength(SIMULATION_CONFIG.physics.chargeStrength),
      )
      .force(
        "collide",
        d3.forceCollide().radius(SIMULATION_CONFIG.physics.collideRadius),
      )
      .force("center", d3.forceCenter(width / 2, height / 2).strength(1));

    const ticked = () => {
      linkGroup
        .selectAll<SVGLineElement, Link>("line")
        .attr("x1", (d) => (d.source as Node).x!)
        .attr("y1", (d) => (d.source as Node).y!)
        .attr("x2", (d) => (d.target as Node).x!)
        .attr("y2", (d) => (d.target as Node).y!);

      nodeGroup
        .selectAll<SVGCircleElement, Node>("circle")
        .attr("cx", (d) => d.x!)
        .attr("cy", (d) => d.y!);
    };

    simulationRef.current.on("tick", ticked);

    const growthInterval = setInterval(() => {
      if (!SIMULATION_CONFIG.growth.animateLinksOnly) {
        // --- FIX 1: REFACTORED to batch state updates ---
        const currentNodes = nodesRef.current;

        if (currentNodes.length >= SIMULATION_CONFIG.growth.maxNodes) {
          clearInterval(growthInterval);
          return;
        }

        if (currentNodes.length === 0) {
          const newNode: Node = { id: nextNodeId.current };
          nextNodeId.current++;
          setNodes([newNode]);
          return;
        }

        const numLinks = Math.min(
          currentNodes.length,
          Math.floor(Math.random() * 2) + 1,
        );
        const shuffledNodes = [...currentNodes].sort(() => 0.5 - Math.random());
        const targetNodes = shuffledNodes.slice(0, numLinks);
        const simulationNodes = simulationRef.current?.nodes() || [];
        const targetSimulationNodes = targetNodes
          .map((target) => simulationNodes.find((n) => n.id === target.id))
          .filter((n): n is Node & { x: number; y: number } =>
            Boolean(n && typeof n.x === "number" && typeof n.y === "number"),
          );

        let initialX = width / 2;
        let initialY = height / 2;

        if (targetSimulationNodes.length > 0) {
          initialX =
            targetSimulationNodes.reduce((acc, node) => acc + node.x, 0) /
            targetSimulationNodes.length;
          initialY =
            targetSimulationNodes.reduce((acc, node) => acc + node.y, 0) /
            targetSimulationNodes.length;
        }

        const newNode: Node = {
          id: nextNodeId.current,
          x: initialX,
          y: initialY,
        };
        nextNodeId.current++;

        const newLinks = targetNodes.map((target) => ({
          source: newNode.id,
          target: target.id,
        }));

        // --- BATCH THE STATE UPDATES ---
        setNodes((prevNodes) => [...prevNodes, newNode]);
        setLinks((prevLinks) => [...prevLinks, ...newLinks]);
      } else {
        // --- Mode 2: Add only new links between existing nodes ---
        setLinks((currentLinks) => {
          const allNodes = nodesRef.current;
          if (
            allNodes.length < 2 ||
            currentLinks.length >= allNodes.length * 1.5
          ) {
            clearInterval(growthInterval);
            return currentLinks;
          }

          let source: Node, target: Node;
          let isConnected = true;
          let attempts = 0;

          while (isConnected && attempts < 100) {
            source = allNodes[Math.floor(Math.random() * allNodes.length)];
            target = allNodes[Math.floor(Math.random() * allNodes.length)];
            if (source.id !== target.id) {
              isConnected = currentLinks.some(
                (link) =>
                  ((link.source as Node).id === source.id &&
                    (link.target as Node).id === target.id) ||
                  ((link.source as Node).id === target.id &&
                    (link.target as Node).id === source.id),
              );
            }
            attempts++;
          }

          if (!isConnected) {
            const newLink: Link = { source: source!.id, target: target!.id };
            return [...currentLinks, newLink];
          }
          return currentLinks;
        });
      }
    }, SIMULATION_CONFIG.growth.addNodeInterval);

    return () => {
      clearInterval(growthInterval);
      simulationRef.current?.stop();
      simulationRef.current = null;
      svg.selectAll("*").remove();
    };
  }, []);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    if (!svg.node() || !simulationRef.current) return;

    const g = svg.select("g");
    if (g.empty()) return;

    const simulation = simulationRef.current;

    simulation.nodes(nodes);

    function drag(simulation: d3.Simulation<Node, Link>) {
      function dragstarted(
        event: d3.D3DragEvent<SVGCircleElement, Node, Node>,
        d: Node,
      ) {
        if (!event.active) simulation.alphaTarget(0.1).restart();
        d.fx = d.x;
        d.fy = d.y;
      }
      function dragged(
        event: d3.D3DragEvent<SVGCircleElement, Node, Node>,
        d: Node,
      ) {
        d.fx = event.x;
        d.fy = event.y;
      }
      function dragended(
        event: d3.D3DragEvent<SVGCircleElement, Node, Node>,
        d: Node,
      ) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }
      return d3
        .drag<SVGCircleElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    g.select(".nodes")
      .selectAll<SVGCircleElement, Node>("circle")
      .data(nodes, (d) => d.id)
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("r", 0)
            .attr("fill", SIMULATION_CONFIG.style.nodeFillColor)
            .attr("stroke", SIMULATION_CONFIG.style.nodeStrokeColor)
            .attr("stroke-width", SIMULATION_CONFIG.style.nodeStrokeWidth)
            .style("filter", "url(#glow)")
            .call(drag(simulation))
            .call((node) => node.append("title").text((d) => `Node ${d.id}`))
            .transition()
            .duration(SIMULATION_CONFIG.style.transitionDuration)
            .attr("r", SIMULATION_CONFIG.style.nodeRadius),
        (update) => update,
        (exit) =>
          exit
            .transition()
            .duration(SIMULATION_CONFIG.style.transitionDuration)
            .attr("r", 0)
            .remove(),
      );

    (simulation.force("link") as d3.ForceLink<Node, Link>).links(links);

    g.select(".links")
      .selectAll<SVGLineElement, Link>("line")
      .data(links, (d) => `${(d.source as Node).id}-${(d.target as Node).id}`)
      .join(
        (enter) =>
          enter
            .append("line")
            .attr("stroke", SIMULATION_CONFIG.style.linkStrokeColor)
            .attr("stroke-width", 0)
            .transition()
            .duration(SIMULATION_CONFIG.style.transitionDuration)
            .attr("stroke-width", SIMULATION_CONFIG.style.linkStrokeWidth),
        (update) => update,
        (exit) =>
          exit
            .transition()
            .duration(SIMULATION_CONFIG.style.transitionDuration)
            .attr("stroke-width", 0)
            .remove(),
      );

    simulation.alphaTarget(0.1).restart();
  }, [nodes, links]);

  return <svg ref={svgRef} className={styles.graph}></svg>;
};

export default ConnectingDots;
