import { showNotification } from "@mantine/notifications";
import { IConnectableSearchQuery, ISearchResult } from '../../../../shared/types/search';
import { useSearch } from '@domains/discovery/contexts/SearchContext';
import { api } from '@infrastructure/api/client';
import useFetch from '@core/hooks/useFetch';
import useRabbithole from '@domains/rabbitholes/hooks/useRabbithole';
import { useEffect, useMemo, useRef, useState } from "react";
import { useSpyglassService, IResultsMap } from "./useSpyglassService";
import { IConnectable, IGraphFilters } from '../../../../shared/types/constellation';
import { PartialGlimpseResult } from '@core/utils/partialJsonParser';

interface IUseSearchQueryParams {
  params?: Partial<IConnectableSearchQuery>;
  ignoreRabbithole?: boolean;
  resultFilter?: (id: string) => boolean;
  onResults?: (results: ISearchResult[]) => void;
  onLoading?: (loading: boolean) => void;
}

export interface IUseSearchQueryReturn {
  searchQuery: string;
  setQuery: (query: string) => void;
  handleSearchSubmit: () => void;
  results: ISearchResult[] | null;
  filteredResults: ISearchResult[] | null;
  loading: boolean;
  complete: boolean;
  scope: IGraphFilters;
  setScope: (scope: IGraphFilters) => void;
  glimpseMode: boolean;
  setGlimpseMode: (mode: boolean) => void;
  loadingGlimpse: boolean;
  errorGlimpse: string | null;
  statusGlimpse: string | null;
  glimpseResult: PartialGlimpseResult | null;
  resultsMap: IResultsMap;
  recent: IConnectable[] | undefined;
  loadingRecent: boolean;
  timeTaken: string | null;
  withinRabbithole: boolean;
  reset: () => void;
}

export default function useSearchQuery({
  params,
  ignoreRabbithole = false,
  resultFilter,
  onResults,
}: IUseSearchQueryParams): IUseSearchQueryReturn {
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

  const [complete, setComplete] = useState(false);

  const {
    search: searchGlimpse,
    glimpseResult,
    resultsMap,
    loading: loadingGlimpse,
    error: errorGlimpse,
    status: statusGlimpse,
    reset: resetGlimpse,
  } = useSpyglassService();

  const startTimeRef = useRef<number | null>(null);
  const resultsTimeRef = useRef<number | null>(null);

  const { load: dispatchSearch } = useFetch<IConnectableSearchQuery, ISearchResult[]>({
    url: "/search",
    method: "POST",
    body: {
      query: searchQuery,
      filters: {
        ...scope,
        rabbithole: withinRabbithole
          ? currentRabbithole?.id.toString()
          : scope.rabbithole || undefined,
      },
      tables: ["idea", "task", "source", "excerpt"],
      searchType: { fts: true, vector: true },
      vectorSettings: { effort: "mid" },
      limit: 50,
      ...params,
    },
    dependencies: [scope, glimpseMode, searchQuery, withinRabbithole, params],
    onBefore: () => {
      if (!glimpseMode && searchQuery.length > 0) {
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
    if (!searchQuery) {
      console.error("Tried to submit search query with empty query. This is likely unintentional.");
      return;
    }
    if (glimpseMode) {
      searchGlimpse({
        query: searchQuery,
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
    if (!glimpseMode || !searchQuery) resetGlimpse();
  }, [glimpseMode, searchQuery]);

  // Clear results when search query is empty
  useEffect(() => {
    if (searchQuery === "") {
      setResults(null);
      resetGlimpse();
    }
  }, [searchQuery, setResults, resetGlimpse]);

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

  useEffect(() => {
    if (complete && filteredResults) {
      console.log("Got results: ", filteredResults);
      onResults?.(filteredResults);
    }
  }, [complete, filteredResults]);

  const timeTaken = useMemo(() => {
    if (!startTimeRef.current || !resultsTimeRef.current) return null;
    return ((resultsTimeRef.current - startTimeRef.current) / 1000).toFixed(2);
  }, [startTimeRef.current, resultsTimeRef.current]);

  const handleReset = () => {
    setQuery("");
    setResults(null);
    setLoading(false);
    setComplete(false);
  };

  return {
    // query state
    searchQuery,
    setQuery,
    // submission
    handleSearchSubmit,
    // search results
    results: searchResults,
    filteredResults,
    // loading states
    loading,
    complete,
    scope,
    setScope,
    // glimpse mode
    glimpseMode,
    setGlimpseMode,
    loadingGlimpse,
    errorGlimpse,
    statusGlimpse,
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
