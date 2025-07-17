import { IDBGraph, IIdea, ISafeIdea } from "../../app/database/models/ideas";
import { ISearchResult, ISearchResultValue } from "../../app/services/Search";
import { htmlToMarkdown } from "../../app/utils/formatting";
import {
  IDerivedNode,
  IEdge,
  IFileNode,
  IGraph,
  INode,
} from "../declarations/graph";
import {
  formatDate,
  formatDateTime,
  markdownToHtml,
  sanitizeMarkdownForDescription,
} from "./formatting";
import { splitBySentences } from "./processing";

export const MIN_SIMILARITY_THRESHOLD = 0.5;
export const MIN_GRAPH_DIST = 150; // Target distance for similarity = 1
export const MAX_GRAPH_DIST = 250; // Target distance for similarity = MIN_SIMILARITY_THRESHOLD
export const DISTANCE_EXPONENT = 1; // > 1 emphasizes closeness

export const MIN_STRENGTH = 0.1; // Pull strength for similarity = MIN_SIMILARITY_THRESHOLD
export const MAX_STRENGTH = 0.7; // Pull strength for similarity = 1
export const STRENGTH_EXPONENT = 2; // > 1 emphasizes stronger links

export const dbGraphToLocalGraph = (dbGraph: IDBGraph): IGraph => {
  const ideaNodes = dbGraph.ideas.map((i) => {
    return {
      ...i,
      id: i.id,
      title: i.title,
      content: i.content,
      type: "idea" as const,
    };
  });
  const tagNodes = dbGraph.tags.map((tag) => {
    return {
      ...tag,
      type: "tag" as const,
    };
  });

  const ideaEdges = dbGraph.ideaConnections
    .map((i) => {
      return {
        id: i.id.toString(),
        source: i.in.toString(),
        target: i.out.toString(),
        distance: MIN_GRAPH_DIST,
        strength: 0.7,
        visibility: "high" as const,
      };
    })
    .flat();

  const tagEdges = dbGraph.tagConnections
    .map((i) => {
      return {
        id: i.id.toString(),
        source: i.in.toString(),
        target: i.out.toString(),
        distance: MAX_GRAPH_DIST * 1.5,
        strength: 0.7,
        visibility: "high" as const,
      };
    })
    .flat();

  const similarEdges = dbGraph.ideas
    .map((i) => {
      return [
        ...(i.similar
          ?.filter(
            (d) => d.distance > MIN_SIMILARITY_THRESHOLD && d.id !== i.id,
          )
          .map((d) => {
            const similarity = d.distance; // clarity: d.distance is the similarity score

            // --- Calculate Target Distance (Non-Linear Inversion) ---
            const invertedSimilarity = 1 - similarity;
            const normalizedInverted =
              invertedSimilarity / (1 - MIN_SIMILARITY_THRESHOLD);
            const distanceFactor = Math.pow(
              normalizedInverted,
              DISTANCE_EXPONENT,
            );
            const targetDistance =
              MIN_GRAPH_DIST +
              distanceFactor * (MAX_GRAPH_DIST - MIN_GRAPH_DIST);

            // --- Calculate Link Strength (Non-Linear) ---
            const normalizedSimilarity =
              (similarity - MIN_SIMILARITY_THRESHOLD) /
              (1 - MIN_SIMILARITY_THRESHOLD);
            const strengthFactor = Math.pow(
              normalizedSimilarity,
              STRENGTH_EXPONENT,
            );
            const linkStrength =
              MIN_STRENGTH + strengthFactor * (MAX_STRENGTH - MIN_STRENGTH);

            return {
              id: i.id.toString() + d.id.toString(),
              source: i.id.toString(),
              target: d.id.toString(),
              distance: targetDistance,
              strength: linkStrength,
              visibility: "low" as const,
            };
          }) ?? []),
      ] as IEdge[];
    })
    .flat();

  const fileNodes = dbGraph.files.map((f) => {
    return {
      ...f,
      type: "file",
    } as IFileNode;
  });

  const localData: IGraph = {
    nodes: [...ideaNodes, ...tagNodes, ...fileNodes],
    edges: [...ideaEdges, ...tagEdges, ...similarEdges],
  };
  return localData;
};

export const getNodeSubtitle = (node: INode) => {
  if (node.type === "idea") {
    return formatDate(node.createdAt);
  }
  if (node.type === "file") {
    return formatDate(node.createdAt);
  }
  if (node.type === "derived") {
    return node.type;
  }
};

export const getNodeTitle = (node: INode) => {
  if (node.type === "idea") {
    return node.title;
  }
  if (node.type === "file") {
    return node.originalFileName;
  }
  if (node.type === "tag") {
    return node.name;
  }
  if (node.type === "rabbithole") {
    return node.name;
  }
};

export const getNodeDescription = (
  node: INode,
  options?: {
    sentences?: number;
    maxLength?: number;
  },
) => {
  if (node.type === "idea") {
    const desc =
      node.derived?.generative_summary?.sentenceOverview ??
      node.derived?.generative_summary?.sentenceSummary ??
      (node.contentPlain &&
        splitBySentences(sanitizeMarkdownForDescription(node.contentPlain))
          .slice(0, options?.sentences ?? 2)
          .join("... ") + "...") ??
      "No summary available";
    if (options?.maxLength) {
      return desc.slice(0, options.maxLength);
    }
    return desc;
  }
  if (node.type === "file") {
    return node.mimeType;
  }
  if (node.type === "derived") {
    return node.type;
  }
  if (node.type === "tag") {
    return node.description;
  }
  if (node.type === "rabbithole") {
    return formatDateTime(node.updatedAt);
  }
};

export const ideasAreConnected = (
  first: IIdea | ISafeIdea,
  second: IIdea | string,
) => {
  if (!first.connections && !second) {
    return undefined;
  }
  const secondId = typeof second === "string" ? second : second.id.toString();
  const firstHasSecond = !!first.connections?.find(
    (c) => c.id.toString() === secondId,
  );
  return firstHasSecond;
};

export const getNodeAsIdeaOrNull = (node: INode): IIdea | null => {
  if (node.type === "idea") {
    return node;
  }
  return null;
};

export const getNodesAsIdeas = (nodes: INode[]): IIdea[] => {
  return nodes.filter((n) => {
    return n.type === "idea";
  });
};
