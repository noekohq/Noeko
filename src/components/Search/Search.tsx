import React, { useMemo } from "react";
import { Group, Loader, Stack, Text, Button, Transition } from "@mantine/core";
import { getOS } from "../../utils/platform";
import styles from "./Search.module.scss";
import { Link } from "react-router";
import {
  BrainIcon,
  SparkleIcon,
  ArrowClockwiseIcon,
  IconProps,
} from "@phosphor-icons/react";
import type {
  ISearchResultValue,
  ISearchResult,
} from "../../../shared/types/search";
import { IConnectable } from "../../../shared/types/constellation";
import { INode } from "../../declarations/graph";
import { PartialGlimpseResult } from "../../utils/partialJsonParser";
import { IResultsMap } from "../../hooks/useSpyglassService";
import GlimpseModeDisplay from "../Utils/Spyglass/GlimpseModeDisplay";
import useShortcuts from "../../hooks/useShortcuts";
import PaperButton from "../Display/Paper/PaperButton";
import ScopeBuilder from "./ScopeBuilder/ScopeBuilder";
import { SearchBar } from "./SearchBar";
import useSearchQuery from "../../hooks/useSearchQuery";
import { SpyglassIcon } from "../Utils/Icons/Icons";
import PaperSearchResult from "../Display/Paper/PaperSearchResult/PaperSearchResult";
import { getNodeDescription, getNodeTitle } from "../../utils/graph";
import ScopeDisplay from "./ScopeBuilder/ScopeDisplay";

export type ISearchResultAction = {
  id: string;
  label: string;
  icon?: React.ReactElement<IconProps>;
  onClick: () => void;
  disabled?: boolean;
};

type ISearchProps = {
  resultFilter?: (id: string) => boolean;
  ignoreRabbithole?: boolean;
  resultActions?: ((value: ISearchResultValue) => ISearchResultAction)[];
  resultsHeader?: (results: ISearchResult[] | null) => React.ReactNode;
  onResultClick?: (node: INode) => void;
};

type IGlimpseViewProps = {
  error: string | null;
  result: PartialGlimpseResult | null;
  resultsMap: IResultsMap;
  query: string;
  loading: boolean;
  onResultClick?: (node: INode) => void;
  resultsHeader?: (results: ISearchResult[]) => React.ReactNode;
};

const GlimpseView = ({
  error,
  result,
  resultsMap,
  query,
  loading,
  onResultClick,
  resultsHeader,
}: IGlimpseViewProps) => {
  const flatResults = useMemo(() => {
    if (!resultsMap) return [];
    return Object.values(resultsMap).map((node) => ({
      id: node.id,
      value: node,
      score: 1,
    })) as unknown as ISearchResult[];
  }, [resultsMap]);

  return (
    <div className={styles.glimpseContainer}>
      {resultsHeader && flatResults.length > 0 && resultsHeader(flatResults)}
      {error && (
        <Text c="red" size="sm">
          {error}
        </Text>
      )}

      {(result || loading) && (
        <>
          <GlimpseModeDisplay
            view="compact"
            glimpseResult={
              result || {
                summary: "",
                contentMap: [],
                connections: [],
                summaryComplete: false,
              }
            }
            resultsMap={resultsMap || {}}
            query={query}
            loading={loading}
            includeNavigationPrompt
            onResultClick={onResultClick}
          />
        </>
      )}
    </div>
  );
};



type IResultsViewProps = {
  query: string;
  results: ISearchResult[] | null;
  recent: IConnectable[] | undefined;
  loadingRecent: boolean;
  resultActions?: ((value: ISearchResultValue) => ISearchResultAction)[];
  resultsHeader?: (results: ISearchResult[] | null) => React.ReactNode;
  onResultClick?: (node: INode) => void;
};

const ResultsView = ({
  query,
  results,
  recent,
  loadingRecent,
  resultActions,
  resultsHeader,
  onResultClick,
}: IResultsViewProps) => {
  return (
    <Stack gap="xs">
      {resultsHeader && resultsHeader(results)}
      {!query.length && !results?.length && (
        <>
          <Text size="sm" c="dark.4" fw="bold">
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
                  {recent?.map((r) => {
                    const title = getNodeTitle(r);
                    const preview = getNodeDescription(r);

                    if (!title || !preview) return null;

                    return (
                      <PaperSearchResult
                        key={r.id.toString()}
                        node={r as INode}
                        title={title}
                        snippet={preview}
                        onSelect={onResultClick}
                      />
                    );
                  })}
                </Stack>
              );
            }}
          </Transition>
        </>
      )}

      {results?.map((r) => {
        const title = getNodeTitle(r.value);
        const preview = r.highlightText ?? getNodeDescription(r.value);

        if (!title || !preview) return null;

        const actions = resultActions
          ? resultActions.map((f) => f(r.value))
          : undefined;

        return (
          <PaperSearchResult
            key={r.id.toString()}
            node={r.value as INode}
            title={title}
            snippet={preview}
            actions={actions}
            onSelect={onResultClick}
            draggable
          />
        );
      })}
    </Stack>
  );
};

export default function Search({
  resultFilter,
  ignoreRabbithole,
  resultActions,
  resultsHeader,
  onResultClick,
}: ISearchProps) {
  const os = getOS();
  const ctrl = os !== "macos";
  const meta = os === "macos";

  const {
    inputValue,
    setInputValue,
    loading,
    glimpseMode,
    setGlimpseMode,
    handleSearchSubmit,
    reset,
    loadingGlimpse,
    errorGlimpse,
    glimpseResult,
    resultsMap,
    withinRabbithole,
    searchQuery,
    filteredResults,
    recent,
    loadingRecent,
  } = useSearchQuery({
    resultFilter,
    ignoreRabbithole,
  });

  useShortcuts({
    shortcuts: [
      {
        keys: { key: ".", meta: true },
        run: () => setGlimpseMode(!glimpseMode),
      },
      {
        keys: { meta: true, shift: true, key: "s" },
        run: (e) => {
          e.preventDefault();
          setGlimpseMode(!glimpseMode);
        },
      },
      {
        keys: { ctrl: true, shift: true, key: "s" },
        run: (e) => {
          e.preventDefault();
          setGlimpseMode(!glimpseMode);
        },
      },
    ],
  });

  return (
    <div className={styles.searchWrapper}>
      <SearchBar
        query={inputValue || ""}
        setQuery={setInputValue}
        loading={loading}
        onClear={reset}
        withinRabbithole={withinRabbithole}
        onSearchSubmit={handleSearchSubmit}
        onShortcuts={[{ key: "/", ctrl, meta }]}
      />

      <Stack gap="xs">
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

        <Group gap="xs">
          <ScopeDisplay />
          <ScopeBuilder />
        </Group>
      </Stack>

      {glimpseMode ? (
        <GlimpseView
          error={errorGlimpse}
          result={glimpseResult}
          resultsMap={resultsMap || {}}
          query={searchQuery}
          loading={loadingGlimpse}
          onResultClick={onResultClick}
          resultsHeader={resultsHeader}
        />
      ) : (
        <ResultsView
          query={searchQuery}
          results={filteredResults}
          recent={recent}
          loadingRecent={loadingRecent}
          resultActions={resultActions}
          resultsHeader={resultsHeader}
          onResultClick={onResultClick}
        />
      )}
    </div>
  );
}
