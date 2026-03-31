import React, { useEffect, useMemo } from "react";
import { Group, Loader, Stack, Text, Button, Transition } from "@mantine/core";
import { getOS } from "@core/utils/platform";
import styles from "./Search.module.scss";
import { Link, useNavigate } from "react-router";
import {
  BrainIcon,
  SparkleIcon,
  ArrowClockwiseIcon,
  IconProps,
  UserIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import type { ISearchResultValue, ISearchResult } from "../../../../../shared/types/search";
import { IConnectable } from "../../../../../shared/types/constellation";
import { INode } from "@/declarations/graph";
import { PartialGlimpseResult } from "@core/utils/partialJsonParser";
import { IResultsMap } from "@domains/discovery/hooks/useSpyglassService";
import GlimpseModeDisplay from "@domains/discovery/components/Spyglass/GlimpseModeDisplay";
import useShortcuts from "@core/hooks/useShortcuts";
import PaperButton from "@core/design/components/Paper/PaperButton";
import ScopeBuilder from "./ScopeBuilder/ScopeBuilder";
import { SearchBar } from "./SearchBar";
import useSearchQuery from "@domains/discovery/hooks/useSearchQuery";
import { SpyglassIcon } from "@core/design/icons/Icons";
import PaperSearchResult from "@core/design/components/Paper/PaperSearchResult/PaperSearchResult";
import { getNodeDescription, getNodeLink, getNodeTitle } from "@infrastructure/graph/utils";
import ScopeDisplay from "./ScopeBuilder/ScopeDisplay";
import { useSearch } from "@domains/discovery/contexts/SearchContext";

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
  onResults?: (results: ISearchResult[]) => void;
  onSearchLoading?: (loading: boolean) => void;
};

type IGlimpseViewProps = {
  error: string | null;
  result: PartialGlimpseResult | null;
  resultsMap: IResultsMap;
  query: string;
  loading: boolean;
  status?: string | null;
  onResultClick?: (node: INode) => void;
  resultsHeader?: (results: ISearchResult[]) => React.ReactNode;
};

const GlimpseView = ({
  error,
  result,
  resultsMap,
  query,
  loading,
  status,
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
            status={status}
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

          <Transition mounted={!!recent && recent.length > 0} transition="fade-up">
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
                        draggable
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

        const actions = resultActions ? resultActions.map((f) => f(r.value)) : undefined;

        return (
          <PaperSearchResult
            key={r.id.toString()}
            node={r.value as INode}
            title={title}
            snippet={preview}
            actions={actions}
            onSelect={onResultClick}
            draggable
            artifacts={
              "author" in r.value && r.value.author
                ? [
                    {
                      icon: UserCircleIcon,
                      label: `${r.value.author.firstName} ${r.value.author.lastName}`.trim(),
                    },
                  ]
                : undefined
            }
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
  onResults,
  onSearchLoading,
}: ISearchProps) {
  const os = getOS();
  const ctrl = os !== "macos";
  const meta = os === "macos";

  const {
    global: {
      results: { set: setGlobalResults },
      topResult: { set: setGlobalTopResult },
    },
  } = useSearch();

  const {
    searchQuery,
    setQuery,
    loading,
    glimpseMode,
    setGlimpseMode,
    handleSearchSubmit,
    reset,
    loadingGlimpse,
    errorGlimpse,
    statusGlimpse,
    glimpseResult,
    resultsMap,
    withinRabbithole,
    filteredResults,
    recent,
    loadingRecent,
  } = useSearchQuery({
    resultFilter,
    ignoreRabbithole,
    onResults,
    onLoading: onSearchLoading,
  });

  console.log("Search results: ", filteredResults);

  const glimpseResultsArray = useMemo(() => {
    if (!resultsMap || Object.keys(resultsMap).length === 0) return null;
    return Object.values(resultsMap).map((node) => ({
      id: node.id,
      value: node,
      score: 1,
    })) as unknown as ISearchResult[];
  }, [resultsMap]);

  useEffect(() => {
    if (glimpseMode) {
      setGlobalResults(glimpseResultsArray);
    } else {
      setGlobalResults(filteredResults);
    }
  }, [glimpseMode, glimpseResultsArray, filteredResults, setGlobalResults]);

  useEffect(() => {
    if (glimpseMode) {
      const entryPointId = glimpseResult?.entryPoint?.resourceId || null;
      setGlobalTopResult(entryPointId);
    } else {
      const firstResultId = filteredResults?.[0]?.id.toString() || null;
      setGlobalTopResult(firstResultId);
    }
  }, [glimpseMode, glimpseResult, filteredResults, setGlobalTopResult]);

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

  const navigate = useNavigate();

  const handleResultClick = (r: INode) => {
    if (onResultClick) {
      onResultClick(r);
      return;
    }
    const link = getNodeLink(r);
    if (link) {
      navigate(link);
    }
  };

  return (
    <div className={styles.searchWrapper}>
      <SearchBar
        query={searchQuery || ""}
        setQuery={setQuery}
        loading={loading}
        onClear={reset}
        withinRabbithole={withinRabbithole}
        onSearchSubmit={handleSearchSubmit}
        onShortcuts={[{ key: "/", ctrl, meta }]}
      />

      <Stack gap="xs">
        <PaperButton withBorder fullWidth size="md" onClick={() => setGlimpseMode(!glimpseMode)}>
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
          status={statusGlimpse}
          onResultClick={handleResultClick}
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
          onResultClick={handleResultClick}
        />
      )}
    </div>
  );
}
