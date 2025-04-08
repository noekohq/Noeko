import { IDBGraph } from "../../app/database/models/ideas";
import { IGraph } from "../declarations/graph";

export const dbGraphToLocalGraph = (dbGraph: IDBGraph): IGraph => {
  const localData: IGraph = {
    nodes:
      dbGraph?.ideas.map((n) => {
        return {
          ...n,
          id: n.id,
          title: n.title,
          content: n.content,
        };
      }) ?? [],
    edges:
      dbGraph?.edges.map((e) => {
        return {
          ...e,
          id: e.id,
          source: e.in,
          target: e.out,
        };
      }) ?? [],
  };
  return localData;
};
