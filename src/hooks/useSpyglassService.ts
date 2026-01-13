import { useCallback, useRef, useState } from "react";
import { api, getAccessToken, serverLocation } from "../server/api";
import {
  IFinding,
  IGlimpseResult,
  ISpyglassIntent,
} from "../../app/services/Spyglass";
import { IConnectable, IConnectableFields } from "../../app/services/Graph";
import { IConnectableSearchQueryTagFilter } from "../../app/services/Search";
import { RecordId } from "surrealdb";

export type ICitationMap = Record<
  string,
  {
    index: number;
    excerpts: string[];
  }
>;
export type IResultsMap = Record<string, IConnectableFields>;

interface ISearchArgs {
  query: string;
  scope?: string[];
  deepAnalysis: boolean;
  rabbithole?: string | RecordId;
  tags?: IConnectableSearchQueryTagFilter;
  date?: {
    createdAt?: {
      after?: string;
      before?: string;
    };
    updatedAt?: {
      after?: string;
      before?: string;
    };
  };
}

interface ISpyglassServiceReturn {
  initialized: boolean;
  intent?: ISpyglassIntent;
  loading: boolean;
  complete: boolean;
  error: string | null;
  results: IConnectableFields[];
  fullResults: IConnectable[];
  findings: IFinding[];
  overview: string;
  glimpseResult: IGlimpseResult | null;
  status: string | null;
  citationMap: ICitationMap;
  resultsMap: IResultsMap;
  search: (args: ISearchArgs, autosave?: boolean) => Promise<void>;
  save: () => Promise<void>;
  reset: () => void;
  uninitialize: () => void;
}

export function useSpyglassService(): ISpyglassServiceReturn {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [intent, setIntent] = useState<ISpyglassIntent | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<IConnectableFields[]>([]);
  const [fullResults, setFullResults] = useState<IConnectable[]>([]);
  const [findings, setFindings] = useState<IFinding[]>([]);
  const [overview, setOverview] = useState("");
  const [glimpseResult, setGlimpseResult] = useState<IGlimpseResult | null>(
    null,
  );
  const [status, setStatus] = useState<string | null>(null);
  const searchArgsRef = useRef<ISearchArgs | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fullFindings = useRef<IFinding[]>([]);
  const fullOverview = useRef<string>("");
  const fullGlimpseResult = useRef<string>("");

  const resetState = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setLoading(false);
    setComplete(false);
    setError(null);
    setResults([]);
    setFindings([]);
    setOverview("");
    setGlimpseResult(null);
    setStatus(null);
    searchArgsRef.current = null;
    fullGlimpseResult.current = "";
    fullFindings.current = [];
    fullOverview.current = "";
  }, []);

  const uninitialize = useCallback(() => {
    setInitialized(false);
  }, [resetState]);

  const search = useCallback(
    async (
      { query, scope, deepAnalysis, rabbithole, tags, date }: ISearchArgs,
      autosave?: boolean,
    ) => {
      setInitialized(true);
      resetState();
      setLoading(true);
      setStatus("Initiating analysis...");
      searchArgsRef.current = {
        query,
        scope,
        deepAnalysis,
        rabbithole,
        tags,
        date,
      };
      abortControllerRef.current = new AbortController();

      try {
        const token = getAccessToken();
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(
          `${serverLocation}/api/search/spyglass/stream`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              query,
              scope,
              deepAnalysis,
              rabbithole,
              tags,
              date,
            }),
            signal: abortControllerRef.current.signal,
            credentials: "include",
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Failed to get stream reader.");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        const processStream = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() || ""; // Keep the last, possibly incomplete line

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const json = line.substring(6);
                if (json) {
                  const parsed = JSON.parse(json);
                  const { type, data } = parsed;

                  switch (type) {
                    case "status":
                      setStatus(data);
                      break;
                    case "intent_loaded":
                      setIntent(data);
                      break;
                    case "resources_loaded":
                      setResults(data);
                      setStatus("Analyzing resources...");
                      break;
                    case "full_results_loaded":
                      setFullResults(data);
                      break;
                    case "findings_chunk":
                      fullFindings.current = [...fullFindings.current, ...data];
                      if (!fullFindings.current) {
                        return;
                      }
                      setFindings(fullFindings.current);
                      break;
                    case "overview_chunk":
                      fullOverview.current = fullOverview.current + data;
                      if (!fullOverview.current) {
                        return;
                      }
                      setOverview(fullOverview.current);
                      break;
                    case "glimpse_chunk":
                      fullGlimpseResult.current += data;
                      try {
                        const parsedGlimpse = JSON.parse(
                          fullGlimpseResult.current,
                        );
                        setGlimpseResult(parsedGlimpse);
                      } catch (e) {
                        // JSON is not yet complete, do nothing
                      }
                      break;
                    case "completed":
                      setLoading(false);
                      setComplete(true);
                      setStatus("Analysis complete.");
                      if (autosave) {
                        await save();
                      }
                      break;
                    case "error":
                      setError(data);
                      setLoading(false);
                      break;
                  }
                }
              }
            }
          }
        };

        await processStream();
      } catch (error: any) {
        if (error.name === "AbortError") {
          console.error("Search aborted");
          return;
        }
        console.error("Search failed:", error);
        setLoading(false);
        setError("An error occurred during the analysis.");
      }
    },
    [resetState],
  );

  const save = useCallback(async () => {
    if (!complete || !searchArgsRef.current) {
      console.error("Cannot save an incomplete or non-existent analysis.");
      return;
    }

    try {
      await api.post(`/search/spyglass/save`, {
        baseQuery: searchArgsRef.current.query,
        scope: searchArgsRef.current.scope || [],
        isDeepAnalysis: searchArgsRef.current.deepAnalysis,
        searchPerformed:
          !searchArgsRef.current.scope ||
          searchArgsRef.current.scope.length === 0,
        intent: intent,
        results: results,
        findings: findings,
        overview: overview,
      });
    } catch (error) {
      console.error("Failed to save analysis:", error);
    }
  }, [searchArgsRef, intent, results, findings, overview]);

  const buildCitationMap = (): ICitationMap => {
    if (!findings) {
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
    for (const finding of findings) {
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

  const getResultsMap = () => {
    return results?.reduce((acc, curr, i) => {
      if (curr) {
        acc[curr.id.toString()] = curr;
      }
      return acc;
    }, {} as IResultsMap);
  };

  const citationMap = buildCitationMap();
  const resultsMap = getResultsMap();

  return {
    initialized,
    loading,
    error,
    complete,
    intent,
    overview,
    glimpseResult,
    status,
    results,
    fullResults,
    findings,
    search,
    save,
    citationMap,
    resultsMap,
    reset: resetState,
    uninitialize,
  } satisfies ISpyglassServiceReturn;
}
