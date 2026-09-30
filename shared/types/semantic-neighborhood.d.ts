import type { IConnectable, IGraphFilters } from "./constellation";

export type ISemanticNeighbor = IConnectable & {
  similarity: number;
  explicitlyConnected: boolean;
};

export type ISemanticNeighborhoodRequest = {
  filters?: IGraphFilters;
  limit?: number;
  threshold?: number;
  /** Existing explicit connections are included by default. */
  includeConnected?: boolean;
};

export type ISemanticNeighborhoodResult = {
  sourceId: string;
  status: "ready" | "embedding_unavailable";
  reason?: "missing_embedding";
  neighbors: ISemanticNeighbor[];
};
