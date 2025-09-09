import * as d3 from "d3-force";
import { INode, IEdge } from "../declarations/graph.d";

// --- Type Definitions for the Worker ---

// A simplified node type for the simulation, compatible with d3.
// It extends SimulationNodeDatum which includes x, y, vx, vy, fx, fy.
type SimNode = INode & d3.SimulationNodeDatum;

// A simplified edge type, ensuring source/target are strings for d3.
type SimEdge = IEdge & {
  source: string;
  target: string;
};

// --- Worker State ---

let simulation: d3.Simulation<SimNode, SimEdge> | null = null;
const nodeMap = new Map<string, SimNode>();

// --- Message Handler ---

/**
 * The main message handler for the worker. It receives commands and data from the main UI thread.
 */
self.onmessage = (event: MessageEvent) => {
  const { type, payload } = event.data;

  switch (type) {
    // Initializes or updates the simulation with a new set of nodes and edges.
    case "update_data":
      if (simulation) {
        simulation.stop();
      }
      initializeSimulation(payload.nodes, payload.edges);
      break;

    // Updates the fixed position (fx, fy) of a single node during a drag.
    case "update_node_position":
      if (simulation) {
        const node = nodeMap.get(payload.id);
        if (node) {
          node.fx = payload.fx;
          node.fy = payload.fy;
          // Reheat the simulation to make the graph react to the drag.
          simulation.alpha(0.5).restart();
        }
      }
      break;

    // Releases a node's fixed position when a drag operation ends.
    case "end_node_drag":
      if (simulation) {
        const node = nodeMap.get(payload.id);
        if (node) {
          node.fx = null;
          node.fy = null;
          // Cool the simulation down.
          simulation.alphaTarget(0);
        }
      }
      break;

    // Stops the simulation completely.
    case "stop":
      if (simulation) {
        simulation.stop();
      }
      break;
  }
};

/**
 * Sets up and starts the D3 force simulation.
 * @param {SimNode[]} nodes - The array of node objects.
 * @param {SimEdge[]} edges - The array of edge objects linking the nodes.
 */
function initializeSimulation(nodes: SimNode[], edges: SimEdge[]) {
  nodeMap.clear();
  nodes.forEach((n) => nodeMap.set(n.id.toString(), n));

  const nodeIds = new Set(nodes.map((n) => n.id.toString()));
  const validEdges = edges.filter(
    (edge) =>
      nodeIds.has(edge.source.toString()) &&
      nodeIds.has(edge.target.toString()),
  );

  simulation = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3
        .forceLink<SimNode, SimEdge>(validEdges)
        .id((d) => d.id.toString())
        .distance((e) => e.distance || 150) // Increased default slightly
        .strength((e) => e.strength || 0.4), // Increased default slightly
    )
    // --- CHANGE 1: Reduced the repulsion force ---
    // From -400 to -200. This makes the graph less "explosive" and more stable.
    // You can tune this value further.
    .force("charge", d3.forceManyBody().strength(-200))

    .force("center", d3.forceCenter(0, 0))

    // --- CHANGE 2: Added a collision force ---
    // This is the most critical change. It prevents nodes from overlapping.
    // The radius should be large enough to contain your node's visual representation
    // (the circle AND the text box). Your UI is about 124px wide and ~150px tall,
    // so a radius of 80 is a good starting point to create a non-overlapping buffer.
    .force("collide", d3.forceCollide().radius(80).strength(0.8));

  // On each "tick", send updated node positions back to the main thread.
  simulation.on("tick", () => {
    self.postMessage({
      type: "tick",
      nodes: simulation!.nodes().map(({ id, x, y }) => ({ id, x, y })),
    });
  });

  // Notify the main thread when the simulation has cooled down and stopped.
  simulation.on("end", () => {
    self.postMessage({ type: "end" });
  });
}
