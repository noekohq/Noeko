import { useCallback, useEffect, useMemo } from "react";
import styles from "./ConstellationActions.module.scss";
import { IGraph, INode } from "@/declarations/graph";
import { useGraph } from "@domains/constellation/contexts/GraphContext";
import { Button, Group } from "@mantine/core";
import { ArrowsLeftRightIcon, SparkleIcon, TextTIcon } from "@phosphor-icons/react";
import Search from "@domains/discovery/components/Search/Search";
import { ISearchResult } from "../../../../../shared/types/search";
import { useSearch } from "@domains/discovery/contexts/SearchContext";
import { Trans } from "@lingui/react/macro";
import {
  createSelectionHandoff,
  isKnowledgeRefType,
  useWorkflowSelection,
} from "@core/interactions";

type IConstellationActionsProps = {
  graphData: IGraph;
};

export default function ConstellationActions({ graphData }: IConstellationActionsProps) {
  const {
    selected: { addMany: addSelected, removeMany: removeSelected, set: setSelected },
    focused: { set: setFocused },
    highlighted: { set: setHighlighted },
    loading: { set: setLoading },
  } = useGraph();

  const {
    global: {
      loading: { get: searchIsLoading },
      results: { get: searchResults },
      topResult: { get: topResult },
      query: { get: searchQuery },
    },
  } = useSearch();
  const workflowSelection = useWorkflowSelection();
  const graphNodeIds = useMemo(
    () => new Set(graphData.nodes.map((node) => node.id.toString())),
    [graphData.nodes]
  );
  const filterToLoadedGraph = useCallback((id: string) => graphNodeIds.has(id), [graphNodeIds]);

  useEffect(() => {
    setLoading(searchIsLoading);
  }, [searchIsLoading, setLoading]);

  useEffect(() => {
    if (searchResults) {
      setHighlighted(searchResults.map((r) => r.id.toString()));
    } else {
      setHighlighted([]);
    }
  }, [searchResults, setHighlighted]);

  // Focus the top result when it changes
  useEffect(() => {
    if (topResult) {
      setFocused(topResult);
    }
  }, [topResult, setFocused]);

  const handleSelectAllResults = useCallback(
    (results: ISearchResult[]) => {
      if (results) {
        addSelected(results.map((result) => result.id.toString()));
      }
    },
    [addSelected]
  );

  const handleDeselectAllResults = useCallback(
    (results: ISearchResult[]) => {
      if (results) {
        removeSelected(results.map((result) => result.id.toString()));
      }
    },
    [removeSelected]
  );

  const handleUseAsWorkingSet = useCallback(
    (results: ISearchResult[]) => {
      const items = results.flatMap((result) => {
        const node = result.value as INode;
        return isKnowledgeRefType(node.type) ? [{ id: node.id.toString(), type: node.type }] : [];
      });
      workflowSelection.replace(
        createSelectionHandoff({
          items,
          origin: {
            surface: "constellation-search",
            label: "Constellation search",
            query: searchQuery,
          },
        })
      );
      setSelected(items.map((item) => item.id));
    },
    [searchQuery, setSelected, workflowSelection]
  );

  return (
    <div className={`${styles.ui}`}>
      <Search
        resultFilter={filterToLoadedGraph}
        resultArtifacts={(result) => {
          const semantic = result.debug?.source === "semantic";
          const artifacts = [
            {
              icon: semantic ? SparkleIcon : TextTIcon,
              label: semantic ? "Semantic match" : "Text match",
            },
          ];
          if (typeof result.debug?.semanticScore === "number") {
            artifacts.push({
              icon: ArrowsLeftRightIcon,
              label: `${Math.round(result.debug.semanticScore * 100)}% similar`,
            });
          }
          return artifacts;
        }}
        resultsHeader={(results) => {
          if (!results || results.length === 0) return null;
          return (
            <Group gap="xs" my="md">
              <Button
                onClick={() => handleSelectAllResults(results)}
                size="xs"
                radius="lg"
                color="gray"
                variant="light"
              >
                <Trans>Select All</Trans>
              </Button>
              <Button
                onClick={() => handleDeselectAllResults(results)}
                size="xs"
                radius="lg"
                color="gray"
                variant="light"
              >
                <Trans>Deselect All</Trans>
              </Button>
              <Button
                onClick={() => handleUseAsWorkingSet(results)}
                size="xs"
                radius="lg"
                color="gray"
                variant="light"
              >
                Use as Working Set
              </Button>
            </Group>
          );
        }}
        onResultClick={(node) => {
          setFocused(node.id.toString());
        }}
      />
    </div>
  );
}
