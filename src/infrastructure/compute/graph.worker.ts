import * as d3 from "d3-force";
import { INode, IEdge } from "@/declarations/graph.d";

// --- Type Definitions for the Worker ---

type SimNode = INode & d3.SimulationNodeDatum;
type SimEdge = IEdge & {
  source: string;
  target: string;
};

// --- Simulation Configuration ---

const SIMULATION_CONFIG = {
  // Alpha is the simulation's "heat." It decays over time.
  alpha: {
    initial: 0.8, // Initial "heat" when the simulation starts.
    reheat: 0.5, // "Heat" applied when a node is dragged.
    coolDownTarget: 0, // Target alpha to cool the simulation down to.
  },
  link: {
    distance: 75, // The ideal distance between connected nodes.
    strength: 0.3, // How strongly the link pulls nodes together.
  },
  charge: {
    strength: -200, // Negative value creates repulsion. Higher absolute value means stronger repulsion.
  },
  collide: {
    radius: 80, // The radius around each node for collision detection.
    strength: 0.8, // How rigidly nodes bounce off each other.
  },
};

// --- Worker State ---

let simulation: d3.Simulation<SimNode, SimEdge> | null = null;
const nodeMap = new Map<string, SimNode>();

// --- Message Handler ---

self.onmessage = (event: MessageEvent) => {
  const { type, payload } = event.data;

  switch (type) {
    case "update_data":
      if (simulation) {
        simulation.stop();
      }
      initializeSimulation(payload.nodes, payload.edges);
      break;

    case "update_node_position":
      if (simulation) {
        const node = nodeMap.get(payload.id);
        if (node) {
          node.fx = payload.fx;
          node.fy = payload.fy;
          // Reheat the simulation using the config value.
          simulation.alpha(SIMULATION_CONFIG.alpha.reheat).restart();
        }
      }
      break;

    case "end_node_drag":
      if (simulation) {
        const node = nodeMap.get(payload.id);
        if (node) {
          node.fx = null;
          node.fy = null;
          // Cool the simulation down using the config value.
          simulation.alphaTarget(SIMULATION_CONFIG.alpha.coolDownTarget);
        }
      }
      break;

    case "stop":
      if (simulation) {
        simulation.stop();
      }
      break;
  }
};

// --- Simulation Initialization ---

function initializeSimulation(nodes: SimNode[], edges: SimEdge[]) {
  nodeMap.clear();
  nodes.forEach((n) => nodeMap.set(n.id.toString(), n));

  const nodeIds = new Set(nodes.map((n) => n.id.toString()));
  const validEdges = edges.filter(
    (edge) => nodeIds.has(edge.source.toString()) && nodeIds.has(edge.target.toString())
  );

  simulation = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3
        .forceLink<SimNode, SimEdge>(validEdges)
        .id((d) => d.id.toString())
        .distance((e) => e.distance || SIMULATION_CONFIG.link.distance)
        .strength((e) => e.strength || SIMULATION_CONFIG.link.strength)
    )
    .force("charge", d3.forceManyBody().strength(SIMULATION_CONFIG.charge.strength))
    .force("center", d3.forceCenter(0, 0))
    .force(
      "collide",
      d3
        .forceCollide()
        .radius(SIMULATION_CONFIG.collide.radius)
        .strength(SIMULATION_CONFIG.collide.strength)
    )
    .stop();

  simulation
    .on("tick", () => {
      self.postMessage({
        type: "tick",
        nodes: simulation!.nodes().map(({ id, x, y }) => ({ id, x, y })),
      });
    })
    .on("end", () => {
      self.postMessage({ type: "end" });
    });

  simulation.alpha(SIMULATION_CONFIG.alpha.initial).restart();
}
