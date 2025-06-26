import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { parseIncompleteJsonArray } from "../../../utils/processing";
import useFetch from "../../../hooks/useFetch";
import { showNotification } from "@mantine/notifications";

const initialAnalysis: ISearchOverview = {
  findings: [],
  overview: "",
};

interface IUseSpyglassArgs {
  query: string;
  onResultsChange?: (results: ISearchResultValue[]) => void;
  onAnalysisChange?: (analysis: ISearchOverview | null) => void;
}

export type IResultsMap = Record<string, ISearchResultValue>;

export type ICitationMap = Record<
  string,
  {
    index: number;
    excerpts: string[];
  }
>;

interface IUseSpyglassReturn {
  timings: {
    startTime: number;
    resultsTime: number;
    findingsTime: number;
    overviewTime: number;
    completeTime: number;
  };
  baseQuery: string;
  results: ISearchResult[];
  loadingResults: boolean;
  analysis: ISearchOverview;
  loadingFindings: boolean;
  loadingOverview: boolean;
  loading: boolean;
  connected: boolean;
  initialized: boolean;
  initializing: boolean;
  complete: boolean;
  citationMap: ICitationMap;
  resultMap: IResultsMap;
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
  const [analysis, setAnalysis] =
    useState<ISpyglassSearch["analysis"]>(initialAnalysis);
  const [loadingResults, setLoadingResults] = useState<boolean>(false);
  const [loadingFindings, setLoadingFindings] = useState<boolean>(false);
  const [loadingOverview, setLoadingOverview] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [complete, setComplete] = useState<boolean>(false);
  const [initializing, setInitializing] = useState<boolean>(false);

  const startTime = useRef<number>(Date.now());
  const resultsTime = useRef<number>(Date.now());
  const findingsTime = useRef<number>(Date.now());
  const overviewTime = useRef<number>(Date.now());
  const completeTime = useRef<number>(Date.now());

  useEffect(() => {
    onResultsChange?.(spyglass?.results || []);
  }, [spyglass?.analysis]);

  useEffect(() => {
    onAnalysisChange?.(spyglass?.analysis || null);
  }, [spyglass?.analysis]);

  const getEndStatusText = () => {
    if (
      !startTime.current ||
      !resultsTime.current ||
      !findingsTime.current ||
      !overviewTime.current ||
      !completeTime.current
    )
      return "Search Complete!";
    const resultsDuration = resultsTime.current - startTime.current;
    const findingsDuration = findingsTime.current - resultsTime.current;
    const overviewDuration = overviewTime.current - findingsTime.current;
    const totalDuration = completeTime.current - startTime.current;

    return `Complete. Results: ${resultsDuration / 1000}s, Findings: ${findingsDuration / 1000}s, Overview: ${overviewDuration / 1000}s, Total: ${totalDuration / 1000}s`;
  };

  const eventSourceRef = useRef<EventSource | null>(null);

  const fullFindings = useRef("");
  const fullOverview = useRef("");

  console.log("Findings: ", analysis?.findings);

  useEffect(() => {
    if (spyglassId && !listening) {
      setListening(true);

      const eventSource = new EventSource(
        `${serverLocation}/api/search/spyglass/sse?spyglassId=${spyglassId}`,
        { withCredentials: true },
      );

      // Store the instance in our ref.
      eventSourceRef.current = eventSource;

      setLoadingResults(true);
      setLoadingFindings(true);
      setLoadingOverview(true);
      startTime.current = Date.now();

      eventSource.onopen = () => {
        setConnected(true);
      };

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
            setStatusText("Something went wrong.");
            console.error(parsedData.data);
            break;
          case "intent_loaded":
            break;
          case "results_loaded":
            resultsTime.current = Date.now();
            setSpyglass(parsedData.data);
            setStatusText(
              `Found ${parsedData.data.results?.length || 0} result${parsedData.data.results?.length === 1 ? "" : "s"} in ${(Date.now() - resultsTime.current) / 1000}s`,
            );
            setLoadingResults(false);
            break;
          case "findings_generating":
            setStatusText("Generating findings...");
            fullFindings.current = "";
            setLoadingFindings(true);
            break;
          case "findings_chunk":
            fullFindings.current += parsedData.data;
            const available = parseIncompleteJsonArray(
              fullFindings.current,
            ) as ISearchOverview["findings"];
            if (available) {
              setAnalysis((prev) => {
                const a = {
                  ...prev,
                  findings: available,
                  overview: parsedData.data.analysis?.overview || "",
                };
                return a;
              });
            }
            return;
          case "findings_loaded":
            findingsTime.current = Date.now();
            setSpyglass(parsedData.data);
            setAnalysis((prev) => {
              if (!prev) {
                return null;
              }
              const a = {
                ...prev,
                findings: parsedData.data.analysis?.findings || [],
                overview: parsedData.data.analysis?.overview || "",
              };
              return a;
            });
            setStatusText(
              `Analyzed ${parsedData.data.results?.length || 0} result${parsedData.data.results?.length === 1 ? "" : "s"} in ${(Date.now() - findingsTime.current) / 1000}s`,
            );
            setLoadingFindings(false);
            break;
          case "overview_generating":
            setSpyglass(parsedData.data);
            fullOverview.current = "";
            setLoadingOverview(true);
            return;
          case "overview_chunk":
            fullOverview.current += parsedData.data;
            if (!analysis || !fullOverview.current) {
              return;
            }
            setAnalysis((prev) => {
              if (!prev) {
                return null;
              }
              const a = {
                ...prev,
                overview: fullOverview.current,
              };
              return a;
            });
            break;
          case "overview_completed":
            overviewTime.current = Date.now();
            setSpyglass(parsedData.data);
            setStatusText(
              `Analyzed ${parsedData.data.results?.length || 0} finding${parsedData.data.results?.length === 1 ? "" : "s"} in ${((overviewTime.current - startTime.current) / 1000).toFixed(2)}s`,
            );
            setLoadingOverview(false);
            break;
          case "completed":
            setSpyglass(parsedData.data);
            setComplete(true);
            setStatusText(getEndStatusText());
            completeTime.current = Date.now();
            // No need to do anything else, the 'close-stream' event will handle the rest.
            break;
        }
      };

      eventSource.onerror = (error) => {
        // We only treat it as an error if the stream wasn't closed cleanly.
        // The `readyState` will be 2 (CLOSED) if we called .close() ourselves.
        if (eventSource.readyState !== EventSource.CLOSED) {
          setError(String(error));
          setStatusText("Error connecting to the server");
          console.error("EventSource error:", error);
        }
        // In any error/end case, we should ensure we stop listening.
        setListening(false);
        eventSource.close(); // Clean up just in case.
      };

      eventSource.addEventListener("close-stream", (event) => {
        setListening(false);
        eventSource.close(); // <-- This is the graceful close!
      });

      return () => {
        eventSource.close();
        eventSourceRef.current = null;
      };
    }
  }, [spyglassId]);

  const initialize = useCallback(async () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setInitializing(true);

    resetState();

    if (!query) {
      console.error("Tried to initialize Spyglass with no query");
      setInitializing(false);
      return;
    }

    try {
      setStatusText("Searching your ideas...");
      const response = await api.post("/search/spyglass/initialize", { query });
      setInitialized(true);
      setInitializing(false);
      const id = response.data.data.id;
      setSpyglassId(id); // This will trigger the useEffect to connect
    } catch (error) {
      console.error(error);
      setInitializing(false);
      setError("Failed to initialize search.");
    }
  }, [query]);

  const refetch = useCallback(async () => {
    try {
      setStatusText("Refetching spyglass...");
      const response = await api.get(`/search/spyglass/record/${spyglassId}`);

      const data = response.data;
      setSpyglass(data);
    } catch (error) {
      console.error(error);
    }
  }, [spyglassId]);

  const resetState = useCallback(async () => {
    try {
      setConnected(false);
      setListening(false);
      setSpyglassId(null);
      setSpyglass(undefined);
      setAnalysis(initialAnalysis);
      setLoadingResults(false);
      setLoadingFindings(false);
      setLoadingOverview(false);
      setStatusText(null);
      setError(null);
      setComplete(false);
      setInitialized(false);
    } catch (error) {
      console.error(error);
    }
  }, [spyglassId]);

  const getResultsMap = () => {
    return spyglass?.fullResults?.reduce((acc, curr, i) => {
      if (curr.value) {
        acc[curr.id.toString()] = curr.value;
      }
      return acc;
    }, {} as IResultsMap);
  };

  const resultMap = getResultsMap();

  const buildCitationMap = (): ICitationMap => {
    if (!analysis) {
      return {};
    }
    const map: Record<
      string,
      {
        excerpts: string[];
        index: number;
      }
    > = {};
    let currRefNumber = 1;
    for (const finding of analysis?.findings) {
      if (!(finding.sourceId in map)) {
        map[finding.sourceId] = {
          excerpts: [finding.excerpt],
          index: currRefNumber,
        };
        currRefNumber++;
      } else {
        map[finding.sourceId].excerpts.push(finding.excerpt);
      }
    }
    return map;
  };

  const citationMap = buildCitationMap();

  return {
    baseQuery: spyglass?.baseQuery,
    results: spyglass?.fullResults || [],
    loading: loadingResults || loadingFindings || loadingOverview,
    loadingResults,
    analysis: analysis || spyglass?.analysis || null,
    loadingFindings,
    loadingOverview,
    status,
    initialized,
    initializing,
    complete,
    connected,
    initialize,
    refetch,
    clear: resetState,
    resultMap,
    citationMap,
    timings: {
      startTime: startTime.current || 0,
      resultsTime: resultsTime.current || 0,
      findingsTime: findingsTime.current || 0,
      overviewTime: overviewTime.current || 0,
      completeTime: completeTime.current || 0,
    },
  } as IUseSpyglassReturn;
}

interface IUseSpyglassRecordArgs {
  spyglassId?: string;
}

interface IUseSpyglassRecordReturn {
  loading: boolean;
  spyglass?: ISpyglassSearch;
  analysis?: ISpyglassSearch["analysis"];
  resultMap?: IResultsMap;
  citationMap?: ICitationMap;
}

export const useSpyglassRecord = ({ spyglassId }: IUseSpyglassRecordArgs) => {
  const [spyglass, setSpyglass] = useState<ISpyglassSearch>();
  const { loading, load: fetchSpyglassRecord } = useFetch<
    undefined,
    ISpyglassSearch
  >({
    url: `/search/spyglass/record/${spyglassId}`,
    dependencies: [spyglassId],
    onError: (error) => {
      console.error("Error getting spyglass record: ", error);
      showNotification({
        title: "Error",
        message: "Failed to fetch spyglass record",
        color: "red",
      });
    },
    onSuccess: (data) => {
      setSpyglass(data);
    },
  });

  useEffect(() => {
    if (spyglassId) {
      fetchSpyglassRecord();
    }
  }, [spyglassId]);

  const analysis = spyglass?.analysis;

  const getResultsMap = () => {
    return spyglass?.fullResults?.reduce((acc, curr, i) => {
      if (curr.value) {
        acc[curr.id.toString()] = curr.value;
      }
      return acc;
    }, {} as IResultsMap);
  };

  const resultMap = getResultsMap();

  const buildCitationMap = (): ICitationMap => {
    if (!analysis) {
      return {};
    }
    const map: Record<
      string,
      {
        excerpts: string[];
        index: number;
      }
    > = {};
    let currRefNumber = 1;
    for (const finding of analysis?.findings) {
      if (!(finding.sourceId in map)) {
        map[finding.sourceId] = {
          excerpts: [finding.excerpt],
          index: currRefNumber,
        };
        currRefNumber++;
      } else {
        map[finding.sourceId].excerpts.push(finding.excerpt);
      }
    }
    return map;
  };

  const citationMap = buildCitationMap();

  return {
    loading,
    analysis,
    spyglass,
    resultMap,
    citationMap,
  } satisfies IUseSpyglassRecordReturn;
};
