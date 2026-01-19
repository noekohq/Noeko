import { useCallback, useEffect } from "react";
import styles from "./ConstellationActions.module.scss";
import { IGraph } from "../../declarations/graph";
import { useGraph } from "../../contexts/GraphContext";
import { SearchBar } from "../../components/Search/SearchBar";
import { Button, Group, Loader, Stack, Text, Transition } from "@mantine/core";
import { getOS } from "../../utils/platform";
import { useLayout } from "../../contexts/LayoutContext";
import PaperThing from "../../components/Display/Paper/Things/PaperThing";
import { getThingPropsFromConnectable } from "../../components/Display/Paper/Things/thingUtils";
import {
  ArrowClockwiseIcon,
  BrainIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import useSearchQuery from "../../hooks/useSearchQuery";
import PaperButton from "../../components/Display/Paper/PaperButton";
import GlimpseModeDisplay from "../../components/Utils/Spyglass/GlimpseModeDisplay";
import { Link } from "react-router";
import { SpyglassIcon } from "../../components/Utils/Icons/Icons";

type IConstellationActionsProps = {
  graphData: IGraph;
};

export default function ConstellationActions({
  graphData,
}: IConstellationActionsProps) {
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
    inputValue,
    setInputValue,
    handleSearchSubmit,
    results,
    loading,
    recent,
    loadingRecent,
    reset,
    glimpseMode,
    setGlimpseMode,
    glimpseResult,
    resultsMap,
    loadingGlimpse,
    errorGlimpse,
    searchQuery,
  } = useSearchQuery({});

  useEffect(() => {
    setLoading(loading || loadingGlimpse);
  }, [loading, loadingGlimpse, setLoading]);

  useEffect(() => {
    if (results) {
      setHighlighted([...results.map((r) => r.id.toString())]);
    } else {
      clearHighlighted();
    }
  }, [results, setHighlighted, clearHighlighted]);

  const handleSelectAllResults = useCallback(() => {
    if (results) {
      results.forEach((r) => {
        addSelected(r.id.toString());
      });
    }
  }, [results, addSelected]);

  const handleDeselectAllResults = useCallback(() => {
    if (results) {
      results.forEach((r) => {
        removeSelected(r.id.toString());
      });
    }
  }, [results, removeSelected]);

  const { isMobile } = useLayout();

  return (
    <div className={`${styles.ui}`}>
      <div className={styles.searchWrapper}>
        <SearchBar
          query={inputValue}
          setQuery={setInputValue}
          loading={loading}
          onClear={reset}
          onShortcuts={[{ key: "/", ctrl, meta }]}
          onSearchSubmit={handleSearchSubmit}
          placeholder={
            isMobile ? "Search..." : `Press ${primaryKey} + / to focus...`
          }
        />
        <Stack gap="xs" my="md">
          <PaperButton
            withBorder
            fullWidth
            size="md"
            onClick={() => setGlimpseMode(!glimpseMode)}
          >
            <Group gap="xs" justify="center" w={"100%"}>
              {glimpseMode ? (
                <SparkleIcon size={12} weight="fill" />
              ) : (
                <BrainIcon size={12} weight="fill" />
              )}
              {glimpseMode ? "Spyglass" : "Smart"}
            </Group>
          </PaperButton>
        </Stack>
        {glimpseMode && (
          <div className={styles.glimpseContainer}>
            {loadingGlimpse && (
              <Group justify="center" my="md">
                <Loader size="sm" type="dots" />
                <Text size="sm" c="dimmed">
                  Analyzing...
                </Text>
              </Group>
            )}
            {errorGlimpse && (
              <Text c="red" size="sm">
                {errorGlimpse}
              </Text>
            )}
            {glimpseResult && (
              <>
                <GlimpseModeDisplay
                  view="compact"
                  glimpseResult={glimpseResult}
                  resultsMap={resultsMap || {}}
                  query={searchQuery}
                  loading={loadingGlimpse}
                />
              </>
            )}
          </div>
        )}
        {!glimpseMode && (
          <>
            {!inputValue.length && !results?.length && (
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
                              { preventClickDefault: true },
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
            {!!results?.length && (
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
              {results
                ?.map((s, i) => {
                  const props = getThingPropsFromConnectable(
                    s.value,
                    { link: undefined },
                    true,
                  );
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
          </>
        )}
      </div>
    </div>
  );
}
