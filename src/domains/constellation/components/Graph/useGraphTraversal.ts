import { useCallback } from "react";
import { IEdge, INode } from "@/declarations/graph";
import { useGraph } from "@domains/constellation/contexts/GraphContext";
import { getNodeEdgeType } from "@infrastructure/graph/utils";

const CONNECTABLE_TYPES = new Set(["idea", "task", "source", "excerpt"]);

interface TraversalParams {
  nodeMap: { [key: string]: INode };
  adjacencyList: { [key: string]: IEdge[] };
}

export function useGraphTraversal({ nodeMap, adjacencyList }: TraversalParams) {
  const {
    selected: { addMany: addSelected, removeMany: removeSelected },
  } = useGraph();

  // This recursive function for CONNECTABLE_TYPES is still perfect. No changes needed.
  const findConnectableCluster = useCallback(
    (currentNodeId: string, visited: Set<string>) => {
      if (visited.has(currentNodeId)) return;
      visited.add(currentNodeId);

      const connectedEdges = adjacencyList[currentNodeId] || [];
      for (const edge of connectedEdges) {
        if (edge.type === "connection" || edge.type === "reference") {
          const neighborId = edge.source === currentNodeId ? edge.target : edge.source;
          const neighborNode = nodeMap[neighborId];
          if (neighborNode && CONNECTABLE_TYPES.has(neighborNode.type)) {
            findConnectableCluster(neighborId, visited);
          }
        }
      }
    },
    [adjacencyList, nodeMap]
  );

  const clusterSelect = useCallback(
    (startNode: INode) => {
      const edgeType = getNodeEdgeType(startNode);

      if (edgeType === "inclusion") {
        const selection = new Set<string>([startNode.id.toString()]);

        const tagsToExpand: INode[] = [];
        const directConnections = adjacencyList[startNode.id.toString()] || [];

        directConnections.forEach((edge) => {
          if (edge.source === startNode.id.toString() && edge.type === "inclusion") {
            const neighborId = edge.target;
            selection.add(neighborId);

            const neighborNode = nodeMap[neighborId];
            if (neighborNode?.type === "tag") {
              tagsToExpand.push(neighborNode);
            }
          }
        });

        tagsToExpand.forEach((tagNode) => {
          const tagConnections = adjacencyList[tagNode.id.toString()] || [];
          tagConnections.forEach((edge) => {
            if (edge.source === tagNode.id.toString() && edge.type === "description") {
              selection.add(edge.target);
            }
          });
        });
        addSelected(selection);
        return;
      }

      if (edgeType === "description") {
        const selection = new Set<string>([startNode.id.toString()]);

        const directConnections = adjacencyList[startNode.id.toString()] || [];

        directConnections.forEach((edge) => {
          if (edge.source === startNode.id.toString() && edge.type === "description") {
            selection.add(edge.target);
          }
        });
        addSelected(selection);
        return;
      }

      if (CONNECTABLE_TYPES.has(startNode.type)) {
        const clusterIds = new Set<string>();
        findConnectableCluster(startNode.id.toString(), clusterIds);
        addSelected(clusterIds);
        return;
      }

      // Handle user nodes - select user and all their shared items
      if (startNode.type === "user") {
        const selection = new Set<string>([startNode.id.toString()]);
        const directConnections = adjacencyList[startNode.id.toString()] || [];
        directConnections.forEach((edge) => {
          if (edge.type === "share") {
            const neighborId = edge.source === startNode.id.toString() ? edge.target : edge.source;
            selection.add(neighborId);
          }
        });
        addSelected(selection);
        return;
      }

      console.error("Cluster select: unhandled type:", startNode.type);
    },
    [adjacencyList, nodeMap, addSelected, findConnectableCluster]
  );

  const clusterDeselect = useCallback(
    (startNode: INode) => {
      const edgeType = getNodeEdgeType(startNode);

      if (edgeType === "inclusion") {
        const selection = new Set<string>([startNode.id.toString()]);
        const tagsToExpand: INode[] = [];
        const directConnections = adjacencyList[startNode.id.toString()] || [];

        directConnections.forEach((edge) => {
          if (edge.source === startNode.id.toString() && edge.type === "inclusion") {
            const neighborId = edge.target;
            selection.add(neighborId);
            const neighborNode = nodeMap[neighborId];
            if (neighborNode?.type === "tag") {
              tagsToExpand.push(neighborNode);
            }
          }
        });

        tagsToExpand.forEach((tagNode) => {
          const tagConnections = adjacencyList[tagNode.id.toString()] || [];
          tagConnections.forEach((edge) => {
            if (edge.source === tagNode.id.toString() && edge.type === "description") {
              selection.add(edge.target);
            }
          });
        });
        removeSelected(selection);
        return;
      }

      if (edgeType === "description") {
        const selection = new Set<string>([startNode.id.toString()]);
        const directConnections = adjacencyList[startNode.id.toString()] || [];
        directConnections.forEach((edge) => {
          if (edge.source === startNode.id.toString() && edge.type === "description") {
            selection.add(edge.target);
          }
        });
        removeSelected(selection);
        return;
      }

      if (CONNECTABLE_TYPES.has(startNode.type)) {
        const clusterIds = new Set<string>();
        findConnectableCluster(startNode.id.toString(), clusterIds);
        removeSelected(clusterIds);
        return;
      }

      // Handle user nodes - deselect user and all their shared items
      if (startNode.type === "user") {
        const selection = new Set<string>([startNode.id.toString()]);
        const directConnections = adjacencyList[startNode.id.toString()] || [];
        directConnections.forEach((edge) => {
          if (edge.type === "share") {
            const neighborId = edge.source === startNode.id.toString() ? edge.target : edge.source;
            selection.add(neighborId);
          }
        });
        removeSelected(selection);
        return;
      }

      console.error("Cluster deselect: unhandled type:", startNode.type);
    },
    [adjacencyList, nodeMap, removeSelected, findConnectableCluster]
  );

  return { clusterSelect, clusterDeselect };
}
