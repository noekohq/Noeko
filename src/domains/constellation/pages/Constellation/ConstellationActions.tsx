import { useCallback, useEffect } from "react";
import styles from "./ConstellationActions.module.scss";
import { IGraph } from "@/declarations/graph";
import { useGraph } from "@domains/constellation/contexts/GraphContext";
import { Button, Group } from "@mantine/core";
import Search from "@domains/discovery/components/Search/Search";
import { ISearchResult } from "../../../../../shared/types/search";
import { useSearch } from "@domains/discovery/contexts/SearchContext";
import { Trans } from "@lingui/react/macro";

type IConstellationActionsProps = {
  graphData: IGraph;
};

export default function ConstellationActions({ graphData }: IConstellationActionsProps) {
  const {
    selected: { addMany: addSelected, removeMany: removeSelected },
    focused: { set: setFocused },
    highlighted: { set: setHighlighted },
    loading: { set: setLoading },
  } = useGraph();

  const {
    global: {
      loading: { get: searchIsLoading },
      results: { get: searchResults },
      topResult: { get: topResult },
    },
  } = useSearch();

  useEffect(() => {
    setLoading(searchIsLoading);
  }, [searchIsLoading]);

  useEffect(() => {
    if (searchResults) {
      setHighlighted(searchResults.map((r) => r.id.toString()));
    } else {
      setHighlighted([]);
    }
  }, [searchResults]);

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

  return (
    <div className={`${styles.ui}`}>
      <Search
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
