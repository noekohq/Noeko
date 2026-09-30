export type IGraphSnapshotNodeType =
  | "idea"
  | "source"
  | "task"
  | "excerpt"
  | "tag"
  | "rabbithole"
  | "user";

export type IGraphSnapshotEdgeType =
  | "connection"
  | "description"
  | "inclusion"
  | "reference"
  | "share";

export type IGraphSnapshotNode = {
  id: string;
  type: IGraphSnapshotNodeType;
  label: string;
  description?: string;
  accessLevel?: string;
  referenceId?: string;
};

export type IGraphSnapshotEdge = {
  id: string;
  type: IGraphSnapshotEdgeType;
  source: string;
  target: string;
  distance: number;
  strength: number;
  visibility: "high" | "medium" | "low";
};

export type IGraphSnapshot = {
  version: 1;
  queryId: string;
  nodes: IGraphSnapshotNode[];
  edges: IGraphSnapshotEdge[];
  stats: {
    nodeCount: number;
    edgeCount: number;
    truncated: boolean;
  };
};
