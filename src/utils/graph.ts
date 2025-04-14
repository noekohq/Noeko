import { IDBGraph } from "../../app/database/models/ideas";
import {
  IDerivedNode,
  IEdge,
  IFileNode,
  IGraph,
  INode,
} from "../declarations/graph";

export const dbGraphToLocalGraph = (dbGraph: IDBGraph): IGraph => {
  const ideaNodes = dbGraph.ideas.map((i) => {
    return {
      ...i,
      id: i.id,
      title: i.title,
      content: i.content,
      type: "idea" as const,
    };
  });

  const ideaEdges = dbGraph.ideas
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

  const fileNodes = dbGraph.files.map((f) => {
    return {
      ...f,
      type: "file",
    } as IFileNode;
  });

  const localData: IGraph = {
    nodes: [
      ...ideaNodes,
      ...fileNodes,
      // ...derivedNodes,
    ],
    edges: [
      ...ideaEdges,
      // ...derivedEdges,
    ],
  };
  return localData;
};
