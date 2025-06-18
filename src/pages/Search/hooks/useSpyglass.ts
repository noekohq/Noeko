import { useCallback, useEffect, useState } from "react";
import {
  ISearchOverview,
  ISearchResultValue,
  type ISearchResult,
} from "../../../../app/services/Search";
import { api, serverLocation } from "../../../server/api";
import {
  ISpyglassGeneratorType,
  ISpyglassSearch,
} from "../../../../app/database/models/search";

interface IUseSpyglassArgs {
  query: string;
  onResultsChange?: (results: ISearchResultValue[]) => void;
  onAnalysisChange?: (analysis: ISearchOverview | null) => void;
}

interface IUseSpyglassReturn {
  baseQuery: string;
  results: ISearchResult[];
  loadingResults: boolean;
  analysis: ISearchOverview;
  loadingAnalysis: boolean;
  statusText: string;
  connected: boolean;
  initialized: boolean;
  complete: boolean;
  initialize: () => Promise<void>;
  refetch: () => Promise<void>;
  clear: (uninitialize?: boolean) => Promise<void>;
}

export default function useSpyglass({
  query,
  onResultsChange = () => {},
  onAnalysisChange = () => {},
}: IUseSpyglassArgs) {
  const [connected, setConnected] = useState<boolean>(false);
  const [listening, setListening] = useState<boolean>(false);
  const [spyglassId, setSpyglassId] = useState<string | null>(null);
  const [spyglass, setSpyglass] = useState<ISpyglassSearch>();
  const [loadingResults, setLoadingResults] = useState<boolean>(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [complete, setComplete] = useState<boolean>(false);

  useEffect(() => {
    onResultsChange?.(spyglass?.results || []);
  }, [spyglass?.analysis]);

  useEffect(() => {
    onAnalysisChange?.(spyglass?.analysis || null);
  }, [spyglass?.analysis]);

  useEffect(() => {
    if (!listening && spyglassId) {
      setListening(true);
      const eventSource = new EventSource(
        `${serverLocation}/api/search/spyglass/sse?spyglassId=${spyglassId}`,
        { withCredentials: true },
      );
      setLoadingResults(true);
      setLoadingAnalysis(true);

      eventSource.onopen = () => {
        setConnected(true);
      };

      eventSource.onmessage = (event) => {
        const parsedData = JSON.parse(event.data) as
          | {
              type: ISpyglassGeneratorType;
              data: ISpyglassSearch;
              statusText: string;
            }
          | { type: "error"; data: string; statusText: string };
        const type = parsedData.type;
        switch (type) {
          case "error":
            setError(parsedData.data as string);
            setStatusText(parsedData.statusText);
            console.error(parsedData.data);
            break;
          case "results_loaded":
            setStatusText(parsedData.statusText);
            setSpyglass(parsedData.data);
            setLoadingResults(false);
            break;
          case "analysis_loaded":
            setStatusText(parsedData.statusText);
            setSpyglass(parsedData.data);
            setLoadingAnalysis(false);
            break;
          case "completed":
            setStatusText(parsedData.statusText);
            setSpyglass(parsedData.data);
            setComplete(true);
            break;
        }
      };

      eventSource.onerror = (error) => {
        setError(String(error));
        setStatusText("Error connecting to the server");
        refetch();
      };

      return () => {
        eventSource.close();
      };
    }
  }, [spyglassId]);

  const initialize = useCallback(async () => {
    try {
      if (!query) {
        console.error("Tried to initialize Spyglass with no query");
        return;
      }
      setStatusText("Searching your ideas...");
      const response = await api.post("/search/spyglass/initialize", {
        query,
      });
      setInitialized(true);

      const id = response.data.data.id;
      setSpyglassId(id);
    } catch (error) {
      console.error(error);
    }
  }, [query]);

  const refetch = useCallback(async () => {
    try {
      setStatusText("Refetching spyglass...");
      const response = await api.get(`/search/spyglass/${spyglassId}`);

      const data = response.data;
      setSpyglass(data);
    } catch (error) {
      console.error(error);
    }
  }, [spyglassId]);

  const handleReset = useCallback(
    async (uninitialize = false) => {
      try {
        setConnected(false);
        setListening(false);
        setSpyglassId(null);
        setSpyglass(undefined);
        setLoadingResults(false);
        setLoadingAnalysis(false);
        setStatusText(null);
        setError(null);
        setComplete(false);
        if (uninitialize) {
          setInitialized(false);
        }
      } catch (error) {
        console.error(error);
      }
    },
    [spyglassId],
  );

  return {
    baseQuery: spyglass?.baseQuery,
    results: spyglass?.fullResults || [],
    loadingResults,
    analysis: spyglass?.analysis || null,
    loadingAnalysis,
    statusText,
    initialized,
    complete,
    connected,
    initialize,
    refetch,
    clear: handleReset,
  } as IUseSpyglassReturn;
}
