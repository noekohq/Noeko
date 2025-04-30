import { IDBGraph } from "../../app/database/models/ideas";
import {
  IDerivedNode,
  IEdge,
  IFileNode,
  IGraph,
  INode,
} from "../declarations/graph";

const MIN_SIMILARITY_THRESHOLD = 0.5;
const MIN_GRAPH_DIST = 100; // Target distance for similarity = 1
const MAX_GRAPH_DIST = 200; // Target distance for similarity = MIN_SIMILARITY_THRESHOLD
const DISTANCE_EXPONENT = 2; // > 1 emphasizes closeness

const MIN_STRENGTH = 0.1; // Pull strength for similarity = MIN_SIMILARITY_THRESHOLD
const MAX_STRENGTH = 1.0; // Pull strength for similarity = 1
const STRENGTH_EXPONENT = 2; // > 1 emphasizes stronger links

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

  const ideaEdges = dbGraph.edges
    .map((i) => {
      return {
        source: i.in.toString(),
        target: i.out.toString(),
        distance: 150,
        strength: 0.7,
        visibility: "high" as const,
      };
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
            visibility: "medium" as const,
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

  const similarEdges = dbGraph.ideas
    .map((i) => {
      return [
        ...(i.similar
          ?.filter((d) => d.distance > 0.5 && d.id !== i.id)
          .map((d) => {
            const similarity = d.distance; // clarity: d.distance is the similarity score

            // --- Calculate Target Distance (Non-Linear Inversion) ---
            const invertedSimilarity = 1 - similarity;
            const normalizedInverted =
              invertedSimilarity / (1 - MIN_SIMILARITY_THRESHOLD);
            const distanceFactor = Math.pow(
              normalizedInverted,
              DISTANCE_EXPONENT,
            );
            const targetDistance =
              MIN_GRAPH_DIST +
              distanceFactor * (MAX_GRAPH_DIST - MIN_GRAPH_DIST);

            // --- Calculate Link Strength (Non-Linear) ---
            const normalizedSimilarity =
              (similarity - MIN_SIMILARITY_THRESHOLD) /
              (1 - MIN_SIMILARITY_THRESHOLD);
            const strengthFactor = Math.pow(
              normalizedSimilarity,
              STRENGTH_EXPONENT,
            );
            const linkStrength =
              MIN_STRENGTH + strengthFactor * (MAX_STRENGTH - MIN_STRENGTH);

            return {
              source: i.id.toString(),
              target: d.id.toString(),
              distance: targetDistance,
              strength: linkStrength,
              visibility: "low" as const,
            };
          }) ?? []),
      ] as IEdge[];
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
      ...similarEdges,
      // ...derivedEdges,
    ],
  };
  return localData;
};
