import { useCallback } from "react";
import { IEdge, INode } from "../../declarations/graph";
import { useGraph } from "../../contexts/GraphContext";
import { getNodeEdgeType } from "../../utils/graph";

const CONNECTABLE_TYPES = new Set(["idea", "task", "source", "excerpt"]);

interface TraversalParams {
  nodeMap: { [key: string]: INode };
  adjacencyList: { [key: string]: IEdge[] };
}

export function useGraphTraversal({ nodeMap, adjacencyList }: TraversalParams) {
  const {
    selected: { add: addSelected, remove: removeSelected },
  } = useGraph();

  // This recursive function for CONNECTABLE_TYPES is still perfect. No changes needed.
  const findConnectableCluster = useCallback(
    (currentNodeId: string, visited: Set<string>) => {
      if (visited.has(currentNodeId)) return;
      visited.add(currentNodeId);

      const connectedEdges = adjacencyList[currentNodeId] || [];
      for (const edge of connectedEdges) {
        if (edge.type === "connection" || edge.type === "reference") {
          const neighborId =
            edge.source === currentNodeId ? edge.target : edge.source;
          const neighborNode = nodeMap[neighborId];
          if (neighborNode && CONNECTABLE_TYPES.has(neighborNode.type)) {
            findConnectableCluster(neighborId, visited);
          }
        }
      }
    },
    [adjacencyList, nodeMap],
  );

  const clusterSelect = useCallback(
    (startNode: INode) => {
      const edgeType = getNodeEdgeType(startNode);

      if (edgeType === "inclusion") {
        addSelected(startNode.id.toString());

        const tagsToExpand: INode[] = [];
        const directConnections = adjacencyList[startNode.id.toString()] || [];

        directConnections.forEach((edge) => {
          if (
            edge.source === startNode.id.toString() &&
            edge.type === "inclusion"
          ) {
            const neighborId = edge.target;
            addSelected(neighborId);

            const neighborNode = nodeMap[neighborId];
            if (neighborNode?.type === "tag") {
              tagsToExpand.push(neighborNode);
            }
          }
        });

        tagsToExpand.forEach((tagNode) => {
          const tagConnections = adjacencyList[tagNode.id.toString()] || [];
          tagConnections.forEach((edge) => {
            if (
              edge.source === tagNode.id.toString() &&
              edge.type === "description"
            ) {
              addSelected(edge.target);
            }
          });
        });
        return;
      }

      if (edgeType === "description") {
        addSelected(startNode.id.toString());

        const directConnections = adjacencyList[startNode.id.toString()] || [];

        directConnections.forEach((edge) => {
          if (
            edge.source === startNode.id.toString() &&
            edge.type === "description"
          ) {
            addSelected(edge.target);
          }
        });
        return;
      }

      if (CONNECTABLE_TYPES.has(startNode.type)) {
        const clusterIds = new Set<string>();
        findConnectableCluster(startNode.id.toString(), clusterIds);
        clusterIds.forEach((nodeId) => addSelected(nodeId));
        return;
      }

      // Handle user nodes - select user and all their shared items
      if (startNode.type === "user") {
        addSelected(startNode.id.toString());
        const directConnections = adjacencyList[startNode.id.toString()] || [];
        directConnections.forEach((edge) => {
          if (edge.type === "share") {
            const neighborId =
              edge.source === startNode.id.toString()
                ? edge.target
                : edge.source;
            addSelected(neighborId);
          }
        });
        return;
      }

      console.error("Cluster select: unhandled type:", startNode.type);
    },
    [adjacencyList, nodeMap, addSelected, findConnectableCluster],
  );

  const clusterDeselect = useCallback(
    (startNode: INode) => {
      const edgeType = getNodeEdgeType(startNode);

      if (edgeType === "inclusion") {
        removeSelected(startNode.id.toString());
        const tagsToExpand: INode[] = [];
        const directConnections = adjacencyList[startNode.id.toString()] || [];

        directConnections.forEach((edge) => {
          if (
            edge.source === startNode.id.toString() &&
            edge.type === "inclusion"
          ) {
            const neighborId = edge.target;
            removeSelected(neighborId);
            const neighborNode = nodeMap[neighborId];
            if (neighborNode?.type === "tag") {
              tagsToExpand.push(neighborNode);
            }
          }
        });

        tagsToExpand.forEach((tagNode) => {
          const tagConnections = adjacencyList[tagNode.id.toString()] || [];
          tagConnections.forEach((edge) => {
            if (
              edge.source === tagNode.id.toString() &&
              edge.type === "description"
            ) {
              removeSelected(edge.target);
            }
          });
        });
        return;
      }

      if (edgeType === "description") {
        removeSelected(startNode.id.toString());
        const directConnections = adjacencyList[startNode.id.toString()] || [];
        directConnections.forEach((edge) => {
          if (
            edge.source === startNode.id.toString() &&
            edge.type === "description"
          ) {
            removeSelected(edge.target);
          }
        });
        return;
      }

      if (CONNECTABLE_TYPES.has(startNode.type)) {
        const clusterIds = new Set<string>();
        findConnectableCluster(startNode.id.toString(), clusterIds);
        clusterIds.forEach((nodeId) => removeSelected(nodeId));
        return;
      }

      // Handle user nodes - deselect user and all their shared items
      if (startNode.type === "user") {
        removeSelected(startNode.id.toString());
        const directConnections = adjacencyList[startNode.id.toString()] || [];
        directConnections.forEach((edge) => {
          if (edge.type === "share") {
            const neighborId =
              edge.source === startNode.id.toString()
                ? edge.target
                : edge.source;
            removeSelected(neighborId);
          }
        });
        return;
      }

      console.error("Cluster deselect: unhandled type:", startNode.type);
    },
    [adjacencyList, nodeMap, removeSelected, findConnectableCluster],
  );

  return { clusterSelect, clusterDeselect };
}
