// graph.d.ts

// Keep your IIdea definition as is
// import { IIdea } from "../../app/database/models/idea";
// Assuming IIdea is defined elsewhere with at least an 'id' and 'title'
export type IIdea = {
  id: string;
  title: string;
  // other properties...
};

// Add simulation properties directly to INode
export type INode = IIdea & {
  x?: number; // Current x position
  y?: number; // Current y position
  vx?: number; // Velocity x
  vy?: number; // Velocity y
  fx?: number | null; // Fixed x position (during drag)
  fy?: number | null; // Fixed y position (during drag)
};

// IEdge can remain largely the same, linking node IDs
export interface IEdge {
  source: string; // ID of the source node
  target: string; // ID of the target node
  // You might add other edge properties if needed
}

// IGraph remains the container for nodes and edges
export type IGraph = {
  nodes: INode[];
  edges: IEdge[];
};

// Type for storing node positions, easier for lookups
export type NodePositionMap = { [key: string]: { x: number; y: number } };
