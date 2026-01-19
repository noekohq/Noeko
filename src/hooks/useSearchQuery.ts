import { showNotification } from "@mantine/notifications";
import {
  IConnectableSearchQuery,
  ISearchResult,
} from "../../app/services/Search";
import { useSearch } from "../contexts/SearchContext";
import { api } from "../server/api";
import useFetch from "./useFetch";
import useRabbithole from "./useRabbithole";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSpyglassService } from "./useSpyglassService";
import { IConnectable } from "../../app/services/Graph";

interface IUseSearchQueryParams {
  params?: Partial<IConnectableSearchQuery>;
  ignoreRabbithole?: boolean;
  resultFilter?: (id: string) => boolean;
}

export default function useSearchQuery({
  params,
  ignoreRabbithole = false,
  resultFilter,
}: IUseSearchQueryParams) {
  const { currentRabbithole } = useRabbithole();
  const withinRabbithole = ignoreRabbithole ? false : !!currentRabbithole;

  const {
    global: {
      results: { get: searchResults, set: setResults },
      query: { get: searchQuery, set: setQuery },
      loading: { get: loading, set: setLoading },
      scope: { get: scope, set: setScope },
      glimpseMode: { get: glimpseMode, set: setGlimpseMode },
    },
  } = useSearch();

  const [inputValue, setInputValue] = useState(searchQuery);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  const {
    search: searchGlimpse,
    glimpseResult,
    resultsMap,
    loading: loadingGlimpse,
    error: errorGlimpse,
    reset: resetGlimpse,
  } = useSpyglassService();

  const startTimeRef = useRef<number | null>(null);
  const resultsTimeRef = useRef<number | null>(null);

  const { load: dispatchSearch } = useFetch<
    IConnectableSearchQuery,
    ISearchResult[]
  >({
    url: "/search",
    method: "POST",
    body: {
      query: inputValue,
      rabbithole: withinRabbithole
        ? currentRabbithole?.id.toString()
        : scope.rabbithole || undefined,
      tags: scope.tags,
      date: scope.date,
      tables: ["idea", "task", "source", "excerpt"],
      searchType: { fts: true, vector: true },
      vectorSettings: { effort: "mid" },
      limit: 50,
      ...params,
    },
    dependencies: [scope, glimpseMode, inputValue, withinRabbithole, params],
    onBefore: () => {
      if (!glimpseMode && inputValue.length > 0) {
        setComplete(false);
        startTimeRef.current = Date.now();
        setLoading(true);
      }
    },
    onSuccess: (r) => {
      if (!glimpseMode) {
        setComplete(true);
        setResults(r);
        resultsTimeRef.current = Date.now();
      }
    },
    onFinally: () => setLoading(false),
  });

  const handleSearchSubmit = () => {
    setQuery(inputValue);
    if (glimpseMode) {
      if (!inputValue) return;
      searchGlimpse({
        query: inputValue,
        deepAnalysis: false,
        rabbithole: scope.rabbithole,
        tags: scope.tags,
        date: scope.date,
      });
    } else {
      dispatchSearch();
    }
  };

  useEffect(() => {
    if (!glimpseMode) resetGlimpse();
  }, [glimpseMode]);

  const {
    data: recent,
    load: loadRecent,
    loading: loadingRecent,
  } = useFetch<undefined, IConnectable[]>({
    url: `/insights/recent?limit=20`,
    method: "GET",
  });

  useEffect(() => {
    if (!searchQuery && !searchResults?.length) loadRecent();
  }, [searchQuery, searchResults]);

  const filteredResults = useMemo(() => {
    if (!searchResults) return null;
    return resultFilter
      ? searchResults.filter((r) => resultFilter(r.id.toString()))
      : searchResults;
  }, [searchResults, resultFilter]);

  const timeTaken = useMemo(() => {
    if (!startTimeRef.current || !resultsTimeRef.current) return null;
    return ((resultsTimeRef.current - startTimeRef.current) / 1000).toFixed(2);
  }, [startTimeRef.current, resultsTimeRef.current]);

  const handleReset = () => {
    setInputValue("");
    setQuery("");
    setResults(null);
    setLoading(false);
    setComplete(false);
  };

  return {
    // query state
    searchQuery,
    inputValue,
    setInputValue,
    // submission
    handleSearchSubmit,
    // search results
    results: searchResults,
    filteredResults,
    // loading states
    loading,
    complete,
    // scope
    scope,
    setScope,
    // glimpse mode
    glimpseMode,
    setGlimpseMode,
    loadingGlimpse,
    errorGlimpse,
    glimpseResult,
    resultsMap,
    // recent items
    recent,
    loadingRecent,
    // misc
    timeTaken,
    withinRabbithole,
    reset: handleReset,
  };
}
