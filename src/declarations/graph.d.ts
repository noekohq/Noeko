// graph.d.ts
import { IIdea, IIdeaDerived } from "../../app/database/models/ideas";
import { IUserFile } from "../../app/database/models/userfile";

// Add simulation properties directly to INode
export type IIdeaNode = IIdea & {
  type: "idea";
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

// IEdge can remain largely the same, linking node IDs
export interface IEdge {
  source: string;
  target: string;
  distance: number;
  strength: number;
  visibility: "high" | "medium" | "low";
}

export type INode = IIdeaNode | IFileNode | IDerivedNode;

// IGraph remains the container for nodes and edges
export type IGraph = {
  nodes: INode[];
  edges: IEdge[];
};

// Type for storing node positions, easier for lookups
export type NodePositionMap = { [key: string]: { x: number; y: number } };
