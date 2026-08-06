import type { IGraph } from "@/declarations/graph";

export type GraphTraceOverlay = {
  nodeIds: string[];
  edgeIds: string[];
  unreachableNodeIds: string[];
};

type AdjacencyStep = { nodeId: string; edgeId: string };

export function buildGraphTrace(graph: IGraph, selectedIds: Iterable<string>): GraphTraceOverlay {
  const targets = [...new Set(selectedIds)].sort();
  if (targets.length < 2) return { nodeIds: targets, edgeIds: [], unreachableNodeIds: [] };

  const adjacency = new Map<string, AdjacencyStep[]>();
  for (const edge of graph.edges) {
    const sourceSteps = adjacency.get(edge.source) ?? [];
    sourceSteps.push({ nodeId: edge.target, edgeId: edge.id });
    adjacency.set(edge.source, sourceSteps);
    const targetSteps = adjacency.get(edge.target) ?? [];
    targetSteps.push({ nodeId: edge.source, edgeId: edge.id });
    adjacency.set(edge.target, targetSteps);
  }
  for (const steps of adjacency.values()) {
    steps.sort((left, right) =>
      left.nodeId === right.nodeId
        ? left.edgeId.localeCompare(right.edgeId)
        : left.nodeId.localeCompare(right.nodeId)
    );
  }

  const connected = new Set([targets[0]]);
  const remaining = new Set(targets.slice(1));
  const traceNodes = new Set([targets[0]]);
  const traceEdges = new Set<string>();
  const unreachableNodeIds: string[] = [];

  while (remaining.size > 0) {
    const originConnected = new Set(connected);
    const queue = [...originConnected].sort();
    const visited = new Set(queue);
    const previous = new Map<string, { nodeId: string; edgeId: string }>();
    let reached: string | undefined;

    for (let index = 0; index < queue.length && !reached; index += 1) {
      const current = queue[index];
      for (const step of adjacency.get(current) ?? []) {
        if (visited.has(step.nodeId)) continue;
        visited.add(step.nodeId);
        previous.set(step.nodeId, { nodeId: current, edgeId: step.edgeId });
        if (remaining.has(step.nodeId)) {
          reached = step.nodeId;
          break;
        }
        queue.push(step.nodeId);
      }
    }

    if (!reached) {
      unreachableNodeIds.push(...[...remaining].sort());
      break;
    }

    let cursor = reached;
    traceNodes.add(cursor);
    remaining.delete(cursor);
    while (!originConnected.has(cursor)) {
      const step = previous.get(cursor);
      if (!step) break;
      traceEdges.add(step.edgeId);
      cursor = step.nodeId;
      traceNodes.add(cursor);
    }
    for (const nodeId of traceNodes) connected.add(nodeId);
  }

  return {
    nodeIds: [...traceNodes].sort(),
    edgeIds: [...traceEdges].sort(),
    unreachableNodeIds: unreachableNodeIds.sort(),
  };
}
