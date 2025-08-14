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

// Add simulation properties directly to INode
export type IIdeaNode = ISafeIdea & {
  type: "idea";
  x?: number; // Current x position
  y?: number; // Current y position
  vx?: number; // Velocity x
  vy?: number; // Velocity y
  fx?: number | null; // Fixed x position (during drag)
  fy?: number | null; // Fixed y position (during drag)
};

export type ITagNode = ITag & {
  type: "tag";
  x?: number; // Current x position
  y?: number; // Current y position
  vx?: number; // Velocity x
  vy?: number; // Velocity y
  fx?: number | null; // Fixed x position (during drag)
  fy?: number | null; // Fixed y position (during drag)
};

export type IDerivedNode = IIdeaDerived & {
  type: "derived";
  x?: number; // Current x position
  y?: number; // Current y position
  vx?: number; // Velocity x
  vy?: number; // Velocity y
  fx?: number | null; // Fixed x position (during drag)
  fy?: number | null; // Fixed y position (during drag)
};

export type IFileNode = IUserFile & {
  type: "file";
  x?: number; // Current x position
  y?: number; // Current y position
  vx?: number; // Velocity x
  vy?: number; // Velocity y
  fx?: number | null; // Fixed x position (during drag)
  fy?: number | null; // Fixed y position (during drag)
};

export type IRabbitholeNode = IRabbithole & {
  type: "rabbithole";
  x?: number; // Current x position
  y?: number; // Current y position
  vx?: number; // Velocity x
  vy?: number; // Velocity y
  fx?: number | null; // Fixed x position (during drag)
  fy?: number | null; // Fixed y position (during drag)
};

export type ISourceNode = ISource & {
  type: "source";
  x?: number; // Current x position
  y?: number; // Current y position
  vx?: number; // Velocity x
  vy?: number; // Velocity y
  fx?: number | null; // Fixed x position (during drag)
  fy?: number | null; // Fixed y position (during drag)
};

// IEdge can remain largely the same, linking node IDs
export interface IEdge {
  id: string;
  source: string;
  target: string;
  distance: number;
  strength: number;
  visibility: "high" | "medium" | "low";
}

export type INode =
  | IIdeaNode
  | IFileNode
  | IDerivedNode
  | ITagNode
  | IRabbitholeNode
  | ISourceNode;

// IGraph remains the container for nodes and edges
export type IGraph = {
  nodes: INode[];
  edges: IEdge[];
};

// Type for storing node positions, easier for lookups
export type NodePositionMap = { [key: string]: { x: number; y: number } };
