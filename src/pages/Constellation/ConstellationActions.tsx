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
import { Button, Group, Loader, Stack, Text, Transition } from "@mantine/core";
import ConnectableThing from "../../components/Display/Interactions/Connections/ConnectableThing";
import { getOS } from "../../utils/platform";
import { useLayout } from "../../contexts/LayoutContext";
import PaperThing from "../../components/Display/Paper/Things/PaperThing";
import { getThingPropsFromConnectable } from "../../components/Display/Paper/Things/thingUtils";
import useFetch from "../../hooks/useFetch";
import { IConnectable } from "../../../app/services/Graph";
import { ArrowClockwiseIcon } from "@phosphor-icons/react";

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
      query: { get: searchQuery },
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
  const {
    data: recent,
    load: loadRecent,
    loading: loadingRecent,
  } = useFetch<undefined, IConnectable[]>({
    url: `/insights/recent?limit=20`,
    method: "GET",
  });
  useEffect(() => {
    if (!searchResults?.length && !searchQuery.length) {
      loadRecent();
    }
  }, [searchResults]);

  const { isMobile } = useLayout();

  return (
    <div className={`${styles.ui}`}>
      <div className={styles.searchWrapper}>
        <SearchBar
          onResultsClear={() => {
            clearHighlighted();
          }}
          onShortcuts={[{ key: "/", ctrl, meta }]}
          placeholder={
            isMobile ? "Search..." : `Press ${primaryKey} + / to focus...`
          }
        />
        {!searchQuery.length && !searchResults?.length && (
          <>
            <Text size="sm" c="dark.4" fw="bold" my="md">
              <Group gap="xs">
                <ArrowClockwiseIcon weight="bold" />
                RECENT
                <Transition mounted={loadingRecent} transition="fade-left">
                  {(style) => {
                    return <Loader style={style} size="xs" color="gray" />;
                  }}
                </Transition>
              </Group>
            </Text>
            <Transition
              mounted={!!recent && recent.length > 0}
              transition="fade-up"
            >
              {(style) => {
                return (
                  <Stack style={style} gap="sm">
                    {recent
                      ?.map((thing, i) => {
                        const props = getThingPropsFromConnectable(
                          thing,
                          {},
                          true,
                        );

                        return (
                          <PaperThing
                            key={thing.id.toString()}
                            {...props}
                            onClick={(node) => {
                              setFocused(node);
                            }}
                            draggable={true}
                            preventClickDefault
                          />
                        );
                      })
                      .filter((r) => !!r)}
                  </Stack>
                );
              }}
            </Transition>
          </>
        )}
        {!!searchResults?.length && (
          <Group gap="xs" my="md">
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
              const props = getThingPropsFromConnectable(s.value, {}, true);
              return (
                <PaperThing
                  key={s.id.toString()}
                  {...props}
                  onClick={(node) => {
                    setFocused(node);
                  }}
                  draggable
                />
              );
            })
            .filter((r) => !!r)}
        </Stack>
      </div>
    </div>
  );
}
