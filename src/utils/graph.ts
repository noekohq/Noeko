import { RecordId } from "surrealdb";
import { IIdea, ISafeIdea } from "../../shared/types/idea";
import { IDBGraph } from "../../shared/types/constellation";
import { ISearchResult, ISearchResultValue } from "../../shared/types/search";
import { htmlToMarkdown } from "../../app/utils/formatting";
import {
  IDerivedNode,
  IEdge,
  IFileNode,
  IGraph,
  INode,
  INodeOrganizationType,
  ITagNode,
} from '@/declarations/graph';
import {
  formatDate,
  formatDateTime,
  markdownToHtml,
  sanitizeMarkdownForDescription,
} from "./formatting";
import { splitBySentences } from "./processing";
import { api } from '@/server/api';
import {
  CheckIcon,
  FileTextIcon,
  LightbulbIcon,
  TagIcon,
  TextAlignLeftIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { RabbitholeIcon } from '@core/design/icons/Icons';
import { ILoadedConstellation } from "../../app/services/Graph";
import { IExcerptReference } from "../../shared/types/excerpt";

export const MIN_SIMILARITY_THRESHOLD = 0.5;
export const MIN_GRAPH_DIST = 150; // Target distance for similarity = 1
export const GRAPH_DISTS = {
  small: 100,
  medium: 200,
  large: 300,
};
export const MAX_GRAPH_DIST = 250; // Target distance for similarity = MIN_SIMILARITY_THRESHOLD
export const DISTANCE_EXPONENT = 1; // > 1 emphasizes closeness

export const MIN_STRENGTH = 0.1; // Pull strength for similarity = MIN_SIMILARITY_THRESHOLD
export const MAX_STRENGTH = 0.7; // Pull strength for similarity = 1
export const STRENGTH_EXPONENT = 2; // > 1 emphasizes stronger links

export const fromConstellation = (constellation: ILoadedConstellation): IGraph => {
  const graph: IGraph = {
    nodes: [],
    edges: [],
  };

  const {
    things,
    connections,
    tags,
    descriptions,
    rabbitholes,
    inclusions,
    references,
    friends,
    shares,
  } = constellation;

  if (things) {
    const connectableNodes: INode[] = things.map((connectable) => {
      return {
        ...connectable,
      } satisfies INode;
    });
    graph.nodes.push(...connectableNodes);
  }

  if (friends) {
    const friendNodes: INode[] = friends.map((friend) => {
      return {
        ...friend,
        type: "user",
      } satisfies INode;
    });
    graph.nodes.push(...friendNodes);
  }

  if (connections) {
    const connectableEdges: IEdge[] = connections.map((connection) => {
      return {
        ...connection,
        type: "connection",
        id: connection.id.toString(),
        source: connection.in.toString(),
        target: connection.out.toString(),
        distance: GRAPH_DISTS.large,
        strength: 0.3,
        visibility: "high" as const,
      };
    });
    graph.edges.push(...connectableEdges);
  }

  if (shares) {
    const shareEdges: IEdge[] = shares.map((share) => {
      return {
        ...share,
        type: "share",
        id: share.id.toString(),
        source: share.in.toString(),
        target: share.out.toString(),
        distance: GRAPH_DISTS.medium,
        strength: 0.5,
        visibility: "medium" as const,
      };
    });
    graph.edges.push(...shareEdges);
  }

  if (tags) {
    const tagNodes: INode[] = tags.map((tag) => {
      return {
        ...tag,
        type: "tag",
      };
    });
    graph.nodes.push(...tagNodes);
  }

  if (descriptions) {
    const descriptionEdges: IEdge[] = descriptions.map((description) => {
      return {
        ...description,
        id: description.id.toString(),
        type: "description",
        source: description.in.toString(),
        target: description.out.toString(),
        distance: GRAPH_DISTS.small,
        strength: 1,
        visibility: "high" as const,
      };
    });

    graph.edges.push(...descriptionEdges);
  }

  if (rabbitholes) {
    const rabbitholeNodes: INode[] = rabbitholes.map((rabbithole) => {
      return {
        ...rabbithole,
        type: "rabbithole",
      } satisfies INode;
    });
    graph.nodes.push(...rabbitholeNodes);
  }

  if (inclusions) {
    const rabbitholeEdges: IEdge[] = inclusions.map((inclusion) => {
      return {
        ...inclusion,
        id: inclusion.id.toString(),
        type: "inclusion",
        source: inclusion.in.toString(),
        target: inclusion.out.toString(),
        distance: GRAPH_DISTS.medium,
        strength: 1,
        visibility: "high" as const,
      };
    });
    graph.edges.push(...rabbitholeEdges);
  }

  if (references) {
    const referenceEdges: IEdge[] = references.map((reference) => {
      return {
        ...reference,
        id: reference.id.toString(),
        type: "reference" as const,
        source: reference.in.toString(),
        target: reference.out.toString(),
        distance: GRAPH_DISTS.large,
        strength: 0.3,
        visibility: "high" as const,
      };
    });
    graph.edges.push(...referenceEdges);
  }

  return graph;
};

export const getNodeOrganizationType = (node: INode): INodeOrganizationType | undefined => {
  switch (node.type) {
    case "tag":
      return "tag";
    case "rabbithole":
      return "rabbithole";
    case "task":
    case "source":
    case "idea":
    case "excerpt":
      return "connectable";
  }
  return undefined;
};

export const getTypeFromId = (id: string): INode["type"] | undefined => {
  if (id.startsWith("idea")) {
    return "idea";
  }
  if (id.startsWith("source")) {
    return "source";
  }
  if (id.startsWith("task")) {
    return "task";
  }
  if (id.startsWith("excerpt")) {
    return "excerpt";
  }
  if (id.startsWith("rabbithole")) {
    return "rabbithole";
  }
  if (id.startsWith("tag")) {
    return "tag";
  }
  if (id.startsWith("user")) {
    return "user";
  }
};

export const getNodeTitle = (node: INode): string | undefined => {
  if (node.type === "idea") {
    return node.title;
  }
  if (node.type === "tag") {
    return node.name;
  }
  if (node.type === "rabbithole") {
    return node.name;
  }
  if (node.type === "task") {
    return node.description;
  }
  if (node.type === "source") {
    return node.displayName;
  }
  if (node.type === "excerpt") {
    return node.sourceText.slice(0, 124) + "...";
  }
  if (node.type === "user") {
    return `${node.firstName} ${node.lastName}`;
  }
};

export const getNodeDescription = (
  node: INode,
  options?: {
    sentences?: number;
    maxLength?: number;
  }
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
  if (node.type === "tag") {
    return node.description;
  }
  if (node.type === "rabbithole") {
    return node.includes
      ? `${node.includes?.length} thing${node.includes.length === 1 ? "" : "s"} included`
      : `Created ${formatDate(node.createdAt)}, updated ${formatDate(node.updatedAt)}.`;
  }
  if (node.type === "source") {
    return node.analysis?.headline ?? node.content.slice(0, 256);
  }
  if (node.type === "task") {
    return node.description;
  }
  if (node.type === "excerpt") {
    return node.note.slice(0, 256);
  }
  if (node.type === "user") {
    return `Joined ${formatDate(node.createdAt)}`;
  }
};

export const getNodeContent = (node: INode) => {
  if (node.type === "idea") {
    return node.content;
  }
  if (node.type === "source") {
    return node.content;
  }
  if (node.type === "task") {
    return node.scratchpad;
  }
  if (node.type === "excerpt") {
    return `<blockquote>${node.sourceText}</blockquote>${node.note}`;
  }
  return undefined;
};

export const getNodeLink = (node: INode) => {
  if (node.type === "idea") {
    return `/idea/${node.id.toString()}`;
  }
  if (node.type === "source") {
    return `/source/${node.id.toString()}`;
  }
  if (node.type === "task") {
    return `/task/${node.id.toString()}`;
  }
  if (node.type === "rabbithole") {
    return `/rabbitholes/${node.id.toString()}`;
  }
  if (node.type === "tag") {
    return `/tags/${node.id.toString()}`;
  }
  if (node.type === "excerpt") {
    return `/sources/${typeof node.references === "string" ? node.references : (node.references as IExcerptReference).id.toString()}`;
  }
  if (node.type === "user") {
    return `/profile/${node.id.toString()}`;
  }
};

export const getNodeLinkFromId = (id: string | RecordId) => {
  const realId = id.toString();
  if (realId.startsWith("idea")) {
    return `/idea/${realId}`;
  }
  if (realId.startsWith("source")) {
    return `/source/${realId}`;
  }
  if (realId.startsWith("task")) {
    return `/task/${realId}`;
  }
  if (realId.startsWith("rabbithole")) {
    return `/rabbitholes/${realId}`;
  }
  if (realId.startsWith("tag")) {
    return `/tag/${realId}`;
  }
  if (realId.startsWith("user")) {
    return `/profile/${realId}`;
  }
};

export const getNodeEdgeType = (node: INode): IEdge["type"] => {
  if (["idea", "task", "source", "excerpt"].includes(node.type)) {
    return "connection";
  }
  if (node.type === "rabbithole") {
    return "inclusion";
  }
  if (node.type === "tag") {
    return "description";
  }
  if (node.type === "user") {
    return "share";
  }
};

export const NodeIcon = (node: INode) => {
  switch (node.type) {
    case "idea":
      return LightbulbIcon;
    case "source":
      return FileTextIcon;
    case "task":
      return CheckIcon;
    case "rabbithole":
      return RabbitholeIcon;
    case "tag":
      return TagIcon;
    case "excerpt":
      return TextAlignLeftIcon;
    case "user":
      return UserIcon;
    default:
      return undefined;
  }
};

export const TypeIcon = (type: INode["type"]) => {
  if (type === "idea") {
    return LightbulbIcon;
  }
  if (type === "source") {
    return FileTextIcon;
  }
  if (type === "task") {
    return CheckIcon;
  }
  if (type === "rabbithole") {
    return RabbitholeIcon;
  }
  if (type === "tag") {
    return TagIcon;
  }
  if (type === "excerpt") {
    return TextAlignLeftIcon;
  }
  if (type === "user") {
    return UserIcon;
  }
};

export const IconMap: Record<INode["type"], React.FC> = {
  idea: LightbulbIcon,
  source: FileTextIcon,
  task: CheckIcon,
  rabbithole: RabbitholeIcon,
  tag: TagIcon,
  excerpt: TextAlignLeftIcon,
  user: UserIcon,
};

export const isIncluded = (connections: (IIdea | ISafeIdea)[], check: IIdea | string) => {
  if (!connections && !check) {
    return undefined;
  }
  const secondId = typeof check === "string" ? check : check.id.toString();
  const isIn = !!connections?.find((c) => c.id.toString() === secondId);
  return isIn;
};

export const getNodeAsIdeaOrNull = (node: INode): ISafeIdea | null => {
  if (node.type === "idea") {
    return node;
  }
  return null;
};

export const getNodesAsIdeas = (nodes: INode[]): ISafeIdea[] => {
  return nodes.filter((n) => {
    return n.type === "idea";
  });
};

export const connect = async (
  sourceId: string | RecordId,
  targetId: string | RecordId
): Promise<boolean> => {
  try {
    const result = await api.post(`/graph/connection`, {
      source: sourceId.toString(),
      target: targetId.toString(),
    });
    const connection = await result.data.data;
    if (!connection) {
      throw new Error("Didn't get data back");
    }
    return !!connection;
  } catch (error) {
    console.error("Couldn't connect things: ", sourceId, targetId, error);
    return false;
  }
};

export const disconnect = async (sourceId: string | RecordId, targetId: string | RecordId) => {
  try {
    const result = await api.delete(`/graph/connection`, {
      data: {
        source: sourceId.toString(),
        target: targetId.toString(),
      },
    });
    const connection = await result.data.data;
    if (!connection) {
      throw new Error("Didn't get data back");
    }
    return connection;
  } catch (error) {
    console.error("Couldn't connect things: ", sourceId, targetId, error);
    return undefined;
  }
};
