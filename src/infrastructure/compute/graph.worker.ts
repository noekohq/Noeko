import * as d3 from "d3-force";
// --- Type Definitions for the Worker ---

type SimNode = d3.SimulationNodeDatum & {
  id: string;
};

type SimEdge = d3.SimulationLinkDatum<SimNode> & {
  source: string;
  target: string;
  distance?: number;
  strength?: number;
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
let useCompactTicks = false;
let baseEdges: SimEdge[] = [];

function emitPositions(type: "layout_ready" | "tick") {
  if (!simulation) return;
  if (useCompactTicks) {
    const nodes = simulation.nodes();
    const positions = new Float32Array(nodes.length * 2);
    for (let index = 0; index < nodes.length; index += 1) {
      positions[index * 2] = nodes[index].x || 0;
      positions[index * 2 + 1] = nodes[index].y || 0;
    }
    self.postMessage({ type, positions }, { transfer: [positions.buffer] });
    return;
  }
  self.postMessage({
    type,
    nodes: simulation.nodes().map(({ id, x, y }) => ({ id, x, y })),
  });
}

// --- Message Handler ---

self.onmessage = (event: MessageEvent) => {
  const { type, payload } = event.data;

  switch (type) {
    case "update_data":
      if (simulation) {
        simulation.stop();
      }
      useCompactTicks = payload.compact === true;
      initializeSimulation(payload.nodes, payload.edges, payload.warmupTicks || 0);
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

    case "update_overlay_edges":
      if (simulation) {
        const overlayEdges = (payload.edges as SimEdge[]).filter(
          (edge) => nodeMap.has(edge.source.toString()) && nodeMap.has(edge.target.toString())
        );
        const linkForce = simulation.force<d3.ForceLink<SimNode, SimEdge>>("link");
        linkForce?.links([...baseEdges, ...overlayEdges]);
        simulation.alpha(Math.max(simulation.alpha(), 0.08)).restart();
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

function initializeSimulation(nodes: SimNode[], edges: SimEdge[], warmupTicks: number) {
  nodeMap.clear();
  nodes.forEach((n) => nodeMap.set(n.id.toString(), n));

  const nodeIds = new Set(nodes.map((n) => n.id.toString()));
  const validEdges = edges.filter(
    (edge) => nodeIds.has(edge.source.toString()) && nodeIds.has(edge.target.toString())
  );
  baseEdges = validEdges.map((edge) => ({
    source: edge.source.toString(),
    target: edge.target.toString(),
    distance: edge.distance,
    strength: edge.strength,
  }));

  simulation = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3
        .forceLink<SimNode, SimEdge>(baseEdges)
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
      emitPositions("tick");
    })
    .on("end", () => {
      self.postMessage({ type: "end" });
    });

  simulation.alpha(SIMULATION_CONFIG.alpha.initial);
  if (warmupTicks > 0) {
    simulation.tick(warmupTicks);
    // The expensive, high-energy portion happened offscreen. Keep a little
    // energy for organic final adjustments without exposing the initial shake.
    simulation.alpha(Math.min(simulation.alpha(), 0.025));
    emitPositions("layout_ready");
  }
  simulation.restart();
}
