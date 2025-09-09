// graph.d.ts
import {
  IIdea,
  IIdeaDerived,
  ISafeIdea,
} from "../../app/database/models/ideas";
import { ITag } from "../../app/database/models/tag";
import { IUserFile } from "../../app/database/models/userfile";
import { IRabbithole } from "../../app/database/models/rabbithole";
import { ISource } from "../../app/database/models/source";
import { ITask } from "../../app/database/models/task";
import { IExcerpt } from "../../app/database/models/excerpt";

export type IIdeaNode = ISafeIdea & {
  type: "idea";
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
};

export type ITagNode = ITag & {
  type: "tag";
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
};

export type IDerivedNode = IIdeaDerived & {
  type: "derived";
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
};

export type IFileNode = IUserFile & {
  type: "file";
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
};

export type IRabbitholeNode = IRabbithole & {
  type: "rabbithole";
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
};

export type ISourceNode = ISource & {
  type: "source";
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
};

export type ITaskNode = ITask & {
  type: "task";
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
};

export type IExcerptNode = IExcerpt & {
  type: "excerpt";
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
};

export interface IEdge {
  id: string;
  source: string;
  target: string;
  distance: number;
  strength: number;
  visibility: "high" | "medium" | "low";
  type?: "connection" | "description" | "inclusion";
}

export type INode =
  | IIdeaNode
  | IFileNode
  | IDerivedNode
  | ITagNode
  | IRabbitholeNode
  | ITaskNode
  | IExcerptNode
  | ISourceNode;

export type IGraph = {
  nodes: INode[];
  edges: IEdge[];
};

export type NodePositionMap = { [key: string]: { x: number; y: number } };
