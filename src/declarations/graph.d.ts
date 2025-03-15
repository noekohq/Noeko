import { SimulationNodeDatum, SimulationLinkDatum } from "d3";
import { IIdea } from "../../app/database/models/idea";

type INode = SimulationNodeDatum & IIdea;

export interface IEdge extends SimulationLinkDatum {
  source: string;
  target: string;
}

export type IGraph = {
  nodes: INode[];
  edges: IEdge[];
};
