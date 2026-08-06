import type { IGraph, INode } from "@/declarations/graph";
import type { IGraphFilters, IConnectableTypes } from "../../../../shared/types/constellation";
import type {
  ISemanticNeighbor,
  ISemanticNeighborhoodRequest,
  ISemanticNeighborhoodResult,
} from "../../../../shared/types/semantic-neighborhood";

export type SemanticSource = {
  id: string;
  type: IConnectableTypes;
};

export type SemanticNeighborhoodOptions = Omit<ISemanticNeighborhoodRequest, "filters"> & {
  filters?: IGraphFilters;
};

export type SemanticNeighborhoodClientState =
  | { status: "idle"; source: null }
  | { status: "loading"; source: SemanticSource }
  | {
      status: "ready";
      source: SemanticSource;
      result: ISemanticNeighborhoodResult & { status: "ready" };
    }
  | {
      status: "embedding-unavailable";
      source: SemanticSource;
      reason: "missing_embedding";
    }
  | { status: "error"; source: SemanticSource; message: string; error: Error };

export type SemanticOverlayEdge = {
  id: string;
  type: "semantic";
  source: string;
  target: string;
  similarity: number;
};

export type SemanticNodeHighlight = {
  nodeId: string;
  role: "source" | "neighbor";
  similarity?: number;
  explicitlyConnected: boolean;
};

export type SemanticExplicitEdgeEvidence = {
  edgeId: string;
  source: string;
  target: string;
  similarity: number;
};

export type SemanticOverlay = {
  sourceId: string | null;
  edges: SemanticOverlayEdge[];
  highlights: SemanticNodeHighlight[];
  explicitEdgeEvidence: SemanticExplicitEdgeEvidence[];
  neighbors: ISemanticNeighbor[];
  unavailableNodeIds: string[];
};

export type SemanticNeighborhoodControllerOptions = SemanticNeighborhoodOptions & {
  graph: IGraph;
  initialSource?: INode | SemanticSource | null;
};
