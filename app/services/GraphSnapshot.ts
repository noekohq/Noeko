import { randomUUID } from "node:crypto";
import type {
  IGraphSnapshot,
  IGraphSnapshotEdge,
  IGraphSnapshotNode,
  IGraphSnapshotNodeType,
} from "../../shared/types/graph-snapshot";
import type { ILoadedConstellation } from "../../shared/types/constellation";

const GRAPH_DISTANCES = {
  small: 100,
  medium: 200,
  large: 300,
} as const;

type SnapshotSourceNode = {
  id: unknown;
  type?: string;
  accessLevel?: unknown;
  title?: string;
  name?: string;
  description?: string;
  displayName?: string;
  sourceText?: string;
  note?: string;
  contentPlain?: string;
  content?: string;
  references?: unknown;
  firstName?: string;
  lastName?: string;
  derived?: {
    generative_summary?: {
      sentenceOverview?: string;
      sentenceSummary?: string;
    };
  };
  analysis?: {
    headline?: string;
  };
};

type SnapshotSourceEdge = {
  id: unknown;
  in: unknown;
  out: unknown;
};

const summarize = (value: string | undefined, maxLength = 256) => {
  if (!value) return undefined;
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
};

const getNodeLabel = (node: SnapshotSourceNode, type: IGraphSnapshotNodeType) => {
  switch (type) {
    case "idea":
      return node.title || "Untitled idea";
    case "source":
      return node.displayName || "Untitled source";
    case "task":
      return node.description || "Untitled task";
    case "excerpt":
      return summarize(node.sourceText, 124) || "Untitled excerpt";
    case "tag":
    case "rabbithole":
      return node.name || `Untitled ${type}`;
    case "user":
      return `${node.firstName || ""} ${node.lastName || ""}`.trim() || "User";
  }
};

const getNodeDescription = (node: SnapshotSourceNode, type: IGraphSnapshotNodeType) => {
  switch (type) {
    case "idea":
      return summarize(
        node.derived?.generative_summary?.sentenceOverview ||
          node.derived?.generative_summary?.sentenceSummary ||
          node.contentPlain
      );
    case "source":
      return summarize(node.analysis?.headline || node.content);
    case "task":
      return summarize(node.description);
    case "excerpt":
      return summarize(node.note);
    case "tag":
      return summarize(node.description);
    default:
      return undefined;
  }
};

const toSnapshotNode = (
  node: SnapshotSourceNode,
  fallbackType?: IGraphSnapshotNodeType
): IGraphSnapshotNode | undefined => {
  const type = (node.type || fallbackType) as IGraphSnapshotNodeType | undefined;
  if (!type) return undefined;

  return {
    id: String(node.id),
    type,
    label: getNodeLabel(node, type),
    description: getNodeDescription(node, type),
    accessLevel: node.accessLevel ? String(node.accessLevel) : undefined,
    referenceId: node.references ? String(node.references) : undefined,
  };
};

const toSnapshotEdge = (
  edge: SnapshotSourceEdge,
  config: Omit<IGraphSnapshotEdge, "id" | "source" | "target">
): IGraphSnapshotEdge => ({
  id: String(edge.id),
  source: String(edge.in),
  target: String(edge.out),
  ...config,
});

export const buildGraphSnapshot = (constellation: ILoadedConstellation): IGraphSnapshot => {
  const nodes = [
    ...(constellation.things || []).map((node) => toSnapshotNode(node as SnapshotSourceNode)),
    ...(constellation.tags || []).map((node) => toSnapshotNode(node as SnapshotSourceNode, "tag")),
    ...(constellation.rabbitholes || []).map((node) =>
      toSnapshotNode(node as SnapshotSourceNode, "rabbithole")
    ),
    ...(constellation.friends || []).map((node) =>
      toSnapshotNode(node as SnapshotSourceNode, "user")
    ),
  ].filter((node): node is IGraphSnapshotNode => !!node);

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = [
    ...(constellation.connections || []).map((edge) =>
      toSnapshotEdge(edge as SnapshotSourceEdge, {
        type: "connection",
        distance: GRAPH_DISTANCES.large,
        strength: 0.3,
        visibility: "high",
      })
    ),
    ...(constellation.descriptions || []).map((edge) =>
      toSnapshotEdge(edge as SnapshotSourceEdge, {
        type: "description",
        distance: GRAPH_DISTANCES.small,
        strength: 1,
        visibility: "high",
      })
    ),
    ...(constellation.inclusions || []).map((edge) =>
      toSnapshotEdge(edge as SnapshotSourceEdge, {
        type: "inclusion",
        distance: GRAPH_DISTANCES.medium,
        strength: 1,
        visibility: "high",
      })
    ),
    ...(constellation.references || []).map((edge) =>
      toSnapshotEdge(edge as SnapshotSourceEdge, {
        type: "reference",
        distance: GRAPH_DISTANCES.large,
        strength: 0.3,
        visibility: "high",
      })
    ),
    ...(constellation.shares || []).map((edge) =>
      toSnapshotEdge(edge as SnapshotSourceEdge, {
        type: "share",
        distance: GRAPH_DISTANCES.medium,
        strength: 0.5,
        visibility: "medium",
      })
    ),
  ].filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));

  return {
    version: 1,
    queryId: randomUUID(),
    nodes,
    edges,
    stats: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      truncated: false,
    },
  };
};
