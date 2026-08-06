import type { IEdge, IGraph, INode } from "@/declarations/graph";
import type { IGraphSnapshot } from "../../../shared/types/graph-snapshot";

export type INormalizedGraph = {
  nodes: INode[];
  edges: IEdge[];
  nodesById: Record<string, INode>;
  edgesById: Record<string, IEdge>;
  adjacencyByNodeId: Record<string, IEdge[]>;
};

export const normalizeGraph = (graph: IGraph): INormalizedGraph => {
  const nodesById: Record<string, INode> = {};
  const edgesById: Record<string, IEdge> = {};
  const adjacencyByNodeId: Record<string, IEdge[]> = {};

  for (const node of graph.nodes) {
    const nodeId = node.id.toString();
    nodesById[nodeId] = node;
    adjacencyByNodeId[nodeId] = [];
  }

  const edges = graph.edges.filter((edge) => {
    if (!nodesById[edge.source] || !nodesById[edge.target]) {
      return false;
    }

    edgesById[edge.id] = edge;
    adjacencyByNodeId[edge.source].push(edge);
    adjacencyByNodeId[edge.target].push(edge);
    return true;
  });

  return {
    nodes: graph.nodes,
    edges,
    nodesById,
    edgesById,
    adjacencyByNodeId,
  };
};

export const fromGraphSnapshot = (snapshot: IGraphSnapshot): IGraph => ({
  nodes: snapshot.nodes.map(
    (node) =>
      ({
        ...node,
        summary: true,
      }) satisfies INode
  ),
  edges: snapshot.edges,
});
