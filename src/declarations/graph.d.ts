import { SimulationNodeDatum, SimulationLinkDatum } from "d3";

interface INode extends SimulationNodeDatum {
  id: string;
  content: string;
}

export interface IEdge extends SimulationLinkDatum {
  source: string;
  target: string;
}

export type IGraph = {
  nodes: INode[];
  edges: IEdge[];
};
