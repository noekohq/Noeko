import { IDBGraph } from "../../app/database/models/ideas";
import { IDerivedNode, IEdge, IGraph, INode } from "../declarations/graph";

export const dbGraphToLocalGraph = (dbGraph: IDBGraph): IGraph => {
  const derivedEdges = dbGraph.ideas
    .map((i) => {
      return [
        ...i.derivedList.map((d) => {
          return {
            source: i.id.toString(),
            target: d.id.toString(),
            distance: 50,
            strength: 1,
          };
        }),
      ] as IEdge[];
    })
    .flat();

  const derivedNodes = dbGraph.ideas
    .map((i) => {
      return [
        ...i.derivedList.map((d) => {
          return {
            ...d,
            type: "derived",
          };
        }),
      ] as IDerivedNode[];
    })
    .flat();

  const localData: IGraph = {
    nodes: [
      ...dbGraph?.ideas.map((n) => {
        return {
          ...n,
          id: n.id,
          title: n.title,
          content: n.content,
          type: "idea" as const,
        };
      }),
    ],
    edges: [
      ...dbGraph?.edges.map((e) => {
        return {
          ...e,
          id: e.id,
          source: e.in,
          target: e.out,
          distance: 150,
          strength: 0.7,
        };
      }),
    ],
    derivedNodes: [],
    derivedEdges: [],
  };
  return localData;
};
