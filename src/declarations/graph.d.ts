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
import { IPublicTask, ITask } from "../../app/database/models/task";
import { IExcerpt } from "../../app/database/models/excerpt";
import { IPublicUser } from "../../app/database/models/user";
import { IShareAccess } from "../../app/database/models/share";

export type IIdeaNode = ISafeIdea & {
  type: "idea";
  accessLevel?: IShareAccess;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
};

export type ITagNode = ITag & {
  type: "tag";
  accessLevel?: IShareAccess;
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
  accessLevel?: IShareAccess;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
};

export type ISourceNode = ISource & {
  type: "source";
  accessLevel?: IShareAccess;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
};

export type ITaskNode = (ITask | IPublicTask) & {
  type: "task";
  accessLevel?: IShareAccess;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
};

export type IExcerptNode = IExcerpt & {
  type: "excerpt";
  accessLevel?: IShareAccess;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
};

export type IUserNode = IPublicUser & {
  type: "user";
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
  type?: "connection" | "description" | "inclusion" | "reference" | "share";
}

export type INode =
  | IIdeaNode
  | ITagNode
  | IRabbitholeNode
  | ITaskNode
  | IExcerptNode
  | ISourceNode
  | IUserNode;

export type IGraph = {
  nodes: INode[];
  edges: IEdge[];
};

export type NodePositionMap = { [key: string]: { x: number; y: number } };

export type INodeOrganizationType = "rabbithole" | "tag" | "connectable";
