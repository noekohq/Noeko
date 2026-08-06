import type { IEdge, IGraph, INode } from "@/declarations/graph";
import type { FindTraceResult } from "../components/Sidebar/types";
import type { ISemanticNeighborhoodResult } from "../../../../shared/types/semantic-neighborhood";
import type { SemanticOverlay, SemanticSource } from "./types";

const emptyOverlay: SemanticOverlay = {
  sourceId: null,
  edges: [],
  highlights: [],
  explicitEdgeEvidence: [],
  neighbors: [],
  unavailableNodeIds: [],
};

const connects = (edge: IEdge, sourceId: string, targetId: string) =>
  (String(edge.source) === sourceId && String(edge.target) === targetId) ||
  (String(edge.source) === targetId && String(edge.target) === sourceId);

const findExplicitEdge = (graph: IGraph, sourceId: string, targetId: string) =>
  graph.edges.find((edge) => edge.type === "connection" && connects(edge, sourceId, targetId));

export function buildSemanticOverlay(
  graph: IGraph,
  source: SemanticSource | null,
  result?: ISemanticNeighborhoodResult
): SemanticOverlay {
  if (!source) return emptyOverlay;

  const sourceId = String(source.id);
  const graphNodeIds = new Set(graph.nodes.map((node) => String(node.id)));
  const neighbors = result?.status === "ready" ? result.neighbors : [];
  const overlay: SemanticOverlay = {
    sourceId,
    edges: [],
    highlights: graphNodeIds.has(sourceId)
      ? [{ nodeId: sourceId, role: "source", explicitlyConnected: false }]
      : [],
    explicitEdgeEvidence: [],
    neighbors,
    unavailableNodeIds: [],
  };

  for (const neighbor of neighbors) {
    const neighborId = String(neighbor.id);
    if (!graphNodeIds.has(neighborId)) {
      overlay.unavailableNodeIds.push(neighborId);
      continue;
    }

    const explicitEdge = findExplicitEdge(graph, sourceId, neighborId);
    const explicitlyConnected = neighbor.explicitlyConnected || !!explicitEdge;
    overlay.highlights.push({
      nodeId: neighborId,
      role: "neighbor",
      similarity: neighbor.similarity,
      explicitlyConnected,
    });

    if (explicitlyConnected) {
      if (explicitEdge) {
        overlay.explicitEdgeEvidence.push({
          edgeId: explicitEdge.id,
          source: sourceId,
          target: neighborId,
          similarity: neighbor.similarity,
        });
      }
      continue;
    }

    overlay.edges.push({
      id: `semantic:${sourceId}:${neighborId}`,
      type: "semantic",
      source: sourceId,
      target: neighborId,
      similarity: neighbor.similarity,
    });
  }

  return overlay;
}

type DisplayableNode = {
  type: INode["type"];
  label?: string;
  description?: string;
  title?: string;
  displayName?: string;
  sourceText?: string;
  note?: string;
  contentPlain?: string;
  content?: string;
  analysis?: { headline?: string };
};

const summarize = (value: string | undefined, maxLength = 180) => {
  if (!value) return "";
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
};

const getNodeTitle = (rawNode: INode) => {
  const node = rawNode as DisplayableNode;
  if (node.label) return node.label;
  switch (node.type) {
    case "idea":
      return node.title || "Untitled idea";
    case "source":
      return node.displayName || "Untitled source";
    case "task":
      return node.description || "Untitled task";
    case "excerpt":
      return summarize(node.sourceText, 124) || "Untitled excerpt";
    default:
      return "Untitled node";
  }
};

const getNodeSnippet = (rawNode: INode) => {
  const node = rawNode as DisplayableNode;
  if (node.description) return summarize(node.description);
  switch (node.type) {
    case "idea":
      return summarize(node.contentPlain);
    case "source":
      return summarize(node.analysis?.headline || node.content);
    case "task":
      return summarize(node.description);
    case "excerpt":
      return summarize(node.note || node.sourceText);
    default:
      return "";
  }
};

/** Adapts in-snapshot neighbors to the prop contract consumed by Find and trace. */
export function toFindTraceResults(
  graph: IGraph,
  result?: ISemanticNeighborhoodResult
): FindTraceResult[] {
  if (!result || result.status !== "ready") return [];

  const nodes = new Map(graph.nodes.map((node) => [String(node.id), node]));
  return result.neighbors.flatMap((neighbor) => {
    const node = nodes.get(String(neighbor.id));
    if (!node) return [];

    return [
      {
        node,
        title: getNodeTitle(node),
        snippet: getNodeSnippet(node),
        evidence: "semantic" as const,
        explanation: neighbor.explicitlyConnected
          ? "Semantically similar and already explicitly connected."
          : "Ranked by cosine similarity to the selected node.",
        similarity: neighbor.similarity,
      },
    ];
  });
}
