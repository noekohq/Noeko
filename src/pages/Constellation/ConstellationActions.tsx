import { useCallback, useEffect } from "react";
import { IDBGraph } from "../../../app/database/models/ideas";
import { ISearchResult } from "../../../app/services/Search";
import styles from "./ConstellationActions.module.scss";
import { IGraph, INode } from "../../declarations/graph";
import { useGraph } from "../../contexts/GraphContext";

import { useAuth } from "../../contexts/AuthContext";
import { useSearch } from "../../contexts/SearchContext";
import Search from "../../components/Search/Search";
import { SearchBar } from "../../components/Search/SearchBar";
import { Button, Group, Stack } from "@mantine/core";
import ConnectableThing from "../../components/Display/Interactions/Connections/ConnectableThing";
import { getOS } from "../../utils/platform";
import { useLayout } from "../../contexts/LayoutContext";

type IConstellationActionsProps = {
  graphData: IGraph;
};

export default function ConstellationActions({
  graphData,
}: IConstellationActionsProps) {
  const { user } = useAuth();
  const os = getOS();
  const primaryKey = os === "macos" ? "⌘" : "Ctrl";
  const ctrl = os !== "macos";
  const meta = os === "macos";

  const {
    highlighted: { set: setHighlighted, clear: clearHighlighted },
    selected: { add: addSelected, remove: removeSelected },
    loading: { set: setLoading },
    focused: { set: setFocused },
  } = useGraph();

  const {
    global: {
      results: { get: searchResults },
      loading: { get: loadingSearch },
    },
  } = useSearch();

  useEffect(() => {
    setLoading(loadingSearch);
  }, [loadingSearch]);

  const handleResults = useCallback((results: ISearchResult[]) => {
    setHighlighted([...results.map((r) => r.id.toString())]);
  }, []);

  useEffect(() => {
    if (searchResults) {
      handleResults(searchResults);
    } else {
      clearHighlighted();
    }
  }, [searchResults, handleResults]);

  const handleSelectAllResults = useCallback(() => {
    if (searchResults) {
      searchResults.forEach((r) => {
        addSelected(r.id.toString());
      });
    }
  }, [searchResults, addSelected]);

  const handleDeselectAllResults = useCallback(() => {
    if (searchResults) {
      searchResults.forEach((r) => {
        removeSelected(r.id.toString());
      });
    }
  }, [searchResults, addSelected]);

  const { isMobile } = useLayout();

  return (
    <div className={`${styles.ui}`}>
      <div className={styles.searchWrapper}>
        <Stack>
          <SearchBar
            onResultsClear={() => {
              clearHighlighted();
            }}
            onShortcuts={[{ key: "/", ctrl, meta }]}
            placeholder={
              isMobile ? "Search..." : `Press ${primaryKey} + / to focus...`
            }
          />
          {!!searchResults?.length && (
            <Group gap="xs">
              <Button
                onClick={() => {
                  handleSelectAllResults();
                }}
                size="xs"
                radius="lg"
                color="gray"
                variant="light"
              >
                Select All
              </Button>
              <Button
                onClick={() => {
                  handleDeselectAllResults();
                }}
                size="xs"
                radius="lg"
                color="gray"
                variant="light"
              >
                Deselect All
              </Button>
            </Group>
          )}
          <Stack>
            {searchResults
              ?.map((s, i) => {
                return (
                  <ConnectableThing
                    key={s.id.toString()}
                    thing={s.value}
                    onClick={(node) => {
                      setFocused(node.id.toString());
                    }}
                  />
                );
              })
              .filter((r) => !!r)}
          </Stack>
        </Stack>
      </div>
    </div>
  );
}
