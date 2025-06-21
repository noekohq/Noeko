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

const initialAnalysis: ISearchOverview = {
  findings: [],
  overview: "",
};

interface IUseSpyglassArgs {
  query: string;
  onResultsChange?: (results: ISearchResultValue[]) => void;
  onAnalysisChange?: (analysis: ISearchOverview | null) => void;
}

export interface IStatusItem {
  id: string;
  content: React.ReactNode | React.ReactNode[];
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
  status: IStatusItem[];
  connected: boolean;
  initialized: boolean;
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
  const [status, setStatus] = useState<IStatusItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [complete, setComplete] = useState<boolean>(false);

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

  const fullFindings = useRef("");
  const fullOverview = useRef("");

  useEffect(() => {
    if (!listening && spyglassId) {
      setListening(true);
      const eventSource = new EventSource(
        `${serverLocation}/api/search/spyglass/sse?spyglassId=${spyglassId}`,
        { withCredentials: true },
      );
      setLoadingResults(true);
      setLoadingFindings(true);
      setLoadingOverview(true);
      startTime.current = Date.now();

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
      handleReset();
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

  const handleReset = useCallback(async () => {
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
  console.log("Results map: ", resultMap);

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
    loadingResults,
    analysis: analysis || spyglass?.analysis || null,
    loadingFindings,
    loadingOverview,
    status,
    initialized,
    complete,
    connected,
    initialize,
    refetch,
    clear: handleReset,
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
