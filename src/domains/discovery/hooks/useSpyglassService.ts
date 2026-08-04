import { useCallback, useEffect, useRef, useState } from "react";
import { api, getAccessToken, serverLocation } from "@infrastructure/api/client";
import { IFinding, ISpyglassHistoryItem, ISpyglassIntent } from "../../../../app/services/Spyglass";
import { IConnectable, IConnectableFields } from "../../../../app/services/Graph";
import { IConnectableSearchQueryTagFilter, ISearchResult } from "../../../../shared/types/search";
import { RecordId } from "surrealdb";
import { parsePartialGlimpseResult, PartialGlimpseResult } from "@core/utils/partialJsonParser";
import {
  scoreConnectablesBySelection,
  extractIdsFromFindings,
  extractIdsFromGlimpseResult,
} from "@domains/discovery/utils/spyglass";
import type { SpyglassRun } from "../../../../shared/types/spyglass-run";

// ===== Parameter Types (exported for DX) =====

export type OnFullResultsLoadedParams = {
  fullResults: IConnectable[];
};

export type OnSelectedResultsUpdateParams = {
  fullResults: IConnectable[];
  selectedResults: ISearchResult[];
  mode: "deep" | "glimpse";
  partial: boolean;
};

export type OnSelectedResultsCompleteParams = {
  fullResults: IConnectable[];
  selectedResults: ISearchResult[];
  mode: "deep" | "glimpse";
};

export type OnSearchEndParams = {
  complete: boolean;
  error?: string | null;
};

// ===== Main Interface =====

export interface ISpyglassServiceArgs {
  // Lifecycle Callbacks

  /**
   * Fires when a search operation begins.
   * Use this to show loading states, clear previous results, etc.
   */
  onSearchStart?: () => void;

  /**
   * Fires when search operation ends (success or failure).
   */
  onSearchEnd?: (params: OnSearchEndParams) => void;

  /**
   * Fires when the search is manually reset via reset().
   */
  onSearchReset?: () => void;

  /**
   * Fires whenever the search status message changes.
   */
  onStatusChange?: (status: string | null) => void;

  /** Fires once the server has durably accepted a Deep Focus run. */
  onRunCreated?: (runId: string) => void;
  onRunLoaded?: (run: SpyglassRun) => void;

  // Results Callbacks

  /**
   * Fires when raw search results are loaded (Phase 1: Search).
   * These are ALL results found by the search, before model filtering.
   * Fires once, early in the process.
   */
  onFullResultsLoaded?: (params: OnFullResultsLoadedParams) => void;

  /**
   * Fires progressively as the model selects results (Phase 2: Selection).
   * Throttled to ~100ms intervals for performance.
   * Fires multiple times including final update (partial: false).
   */
  onSelectedResultsUpdate?: (params: OnSelectedResultsUpdateParams) => void;

  /**
   * Fires once when model has finished selecting results (Phase 2: Complete).
   * This is the final, authoritative set of selected results.
   */
  onSelectedResultsComplete?: (params: OnSelectedResultsCompleteParams) => void;
}

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
  history?: ISpyglassHistoryItem[];
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
  glimpseResult: PartialGlimpseResult | null;
  status: string | null;
  history: ISpyglassHistoryItem[];
  citationMap: ICitationMap;
  resultsMap: IResultsMap;
  runId: string | null;
  search: (args: ISearchArgs, autosave?: boolean) => Promise<void>;
  resume: (runId: string) => Promise<void>;
  cancel: () => Promise<void>;
  save: (force?: boolean) => Promise<void>;
  reset: () => void;
  uninitialize: () => void;
}

export function useSpyglassService(args?: ISpyglassServiceArgs): ISpyglassServiceReturn {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [intent, setIntent] = useState<ISpyglassIntent | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<IConnectableFields[]>([]);
  const [fullResults, setFullResults] = useState<IConnectable[]>([]);
  const [findings, setFindings] = useState<IFinding[]>([]);
  const [overview, setOverview] = useState("");
  const [glimpseResult, setGlimpseResult] = useState<PartialGlimpseResult | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [history, setHistory] = useState<ISpyglassHistoryItem[]>([]);
  const searchArgsRef = useRef<ISearchArgs | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchGenerationRef = useRef(0);
  const fullFindings = useRef<IFinding[]>([]);
  const fullOverview = useRef<string>("");
  const fullGlimpseResult = useRef<string>("");
  const intentRef = useRef<ISpyglassIntent | undefined>(undefined);
  const resultsRef = useRef<IConnectableFields[]>([]);
  const callbacksRef = useRef<ISpyglassServiceArgs | undefined>(args);
  const saveRef = useRef<(force?: boolean) => Promise<void>>(async () => {});
  const fullResultsRef = useRef<IConnectable[]>([]);
  const lastUpdateTimeRef = useRef<number>(0);
  const THROTTLE_MS = 100; // Throttle streaming updates to 100ms

  useEffect(() => {
    callbacksRef.current = args;
  }, [args]);

  const resetState = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = null;
    searchGenerationRef.current += 1;
    setLoading(false);
    setComplete(false);
    setError(null);
    setIntent(undefined);
    setResults([]);
    setFullResults([]);
    setFindings([]);
    setOverview("");
    setGlimpseResult(null);
    setStatus(null);
    setRunId(null);
    setHistory([]);
    searchArgsRef.current = null;
    fullGlimpseResult.current = "";
    fullFindings.current = [];
    fullOverview.current = "";
    intentRef.current = undefined;
    resultsRef.current = [];
    fullResultsRef.current = []; // Reset full results ref
    lastUpdateTimeRef.current = 0; // Reset throttle timer

    // Fire reset callback
    callbacksRef.current?.onSearchReset?.();
  }, []);

  const uninitialize = useCallback(() => {
    setInitialized(false);
  }, []);

  const updateStatus = useCallback((newStatus: string | null) => {
    setStatus(newStatus);
    callbacksRef.current?.onStatusChange?.(newStatus);
  }, []);

  const fireSelectedResultsUpdate = useCallback(
    (partial: boolean, forceImmediate: boolean = false) => {
      // Throttle streaming updates (but not final update)
      if (partial && !forceImmediate) {
        const now = Date.now();
        if (now - lastUpdateTimeRef.current < THROTTLE_MS) {
          return; // Skip this update due to throttling
        }
        lastUpdateTimeRef.current = now;
      }

      if (
        !callbacksRef.current?.onSelectedResultsUpdate &&
        !callbacksRef.current?.onSelectedResultsComplete
      ) {
        return; // No callbacks registered, skip computation
      }

      const mode: "deep" | "glimpse" = searchArgsRef.current?.deepAnalysis ? "deep" : "glimpse";
      let selectedIds: string[] = [];

      if (mode === "deep") {
        // Use accumulated findings
        selectedIds = extractIdsFromFindings(fullFindings.current);
      } else {
        // Parse current glimpse result
        const currentGlimpse = parsePartialGlimpseResult(fullGlimpseResult.current);
        if (currentGlimpse) {
          selectedIds = extractIdsFromGlimpseResult(currentGlimpse);
        }
      }

      const selectedResults = scoreConnectablesBySelection(fullResultsRef.current, selectedIds);

      const params = {
        fullResults: fullResultsRef.current,
        selectedResults,
        mode,
      };

      // Always fire update callback
      callbacksRef.current?.onSelectedResultsUpdate?.({
        ...params,
        partial,
      });

      // Also fire complete callback if this is the final update
      if (!partial) {
        callbacksRef.current?.onSelectedResultsComplete?.(params);
      }
    },
    []
  );

  const runSearch = useCallback(
    async (
      { query, scope, deepAnalysis, rabbithole, tags, date, history: providedHistory }: ISearchArgs,
      autosave?: boolean,
      existingRunId?: string
    ) => {
      abortControllerRef.current?.abort();
      const searchGeneration = searchGenerationRef.current + 1;
      searchGenerationRef.current = searchGeneration;
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setInitialized(true);
      // We don't call resetState() here because we want to preserve history for multi-turn.
      // But we reset the result-specific state.
      setLoading(true);
      setComplete(false);
      setError(null);
      setIntent(undefined);
      setResults([]);
      setFullResults([]);
      setFindings([]);
      setOverview("");
      setGlimpseResult(null);
      updateStatus("Initiating analysis..."); // Use helper instead of setStatus

      // Fire search start callback
      callbacksRef.current?.onSearchStart?.();

      const activeHistory = providedHistory || history;

      searchArgsRef.current = {
        query,
        scope,
        deepAnalysis,
        rabbithole,
        tags,
        date,
        history: activeHistory,
      };
      fullGlimpseResult.current = "";
      fullFindings.current = [];
      fullOverview.current = "";
      intentRef.current = undefined;
      resultsRef.current = [];
      fullResultsRef.current = [];
      lastUpdateTimeRef.current = 0;

      try {
        const token = getAccessToken();
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        let response: Response;
        if (deepAnalysis) {
          let durableRunId = existingRunId;
          if (!durableRunId) {
            const createResponse = await fetch(`${serverLocation}/api/search/spyglass/runs`, {
              method: "POST",
              headers,
              body: JSON.stringify({
                query,
                scope,
                deepAnalysis: true,
                rabbithole,
                tags,
                date,
                history: activeHistory,
              }),
              signal: abortController.signal,
              credentials: "include",
            });
            if (!createResponse.ok) {
              throw new Error(`HTTP error! status: ${createResponse.status}`);
            }
            const created = (await createResponse.json()) as { data: SpyglassRun };
            durableRunId = created.data.id.toString();
            setRunId(durableRunId);
            callbacksRef.current?.onRunCreated?.(durableRunId);
          } else {
            setRunId(durableRunId);
          }
          response = await fetch(
            `${serverLocation}/api/search/spyglass/runs/${encodeURIComponent(durableRunId)}/events?after=0`,
            {
              headers,
              signal: abortController.signal,
              credentials: "include",
            }
          );
        } else {
          setRunId(null);
          response = await fetch(`${serverLocation}/api/search/spyglass/stream`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              query,
              scope,
              deepAnalysis,
              rabbithole,
              tags,
              date,
              history: activeHistory,
            }),
            signal: abortController.signal,
            credentials: "include",
          });
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Failed to get stream reader.");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let terminalEventReceived = false;

        const processStream = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (searchGeneration !== searchGenerationRef.current) {
              await reader.cancel();
              return;
            }

            buffer += decoder.decode(value, { stream: !done });
            const lines = buffer.split(/\r?\n\r?\n/);
            const trailing = lines.pop() || "";
            if (done) {
              if (trailing.trim()) {
                lines.push(trailing);
              }
              buffer = "";
            } else {
              buffer = trailing;
            }

            for (const line of lines) {
              const dataLine = line.split(/\r?\n/).find((part) => part.startsWith("data: "));
              if (dataLine) {
                const json = dataLine.substring(6);
                if (json) {
                  const parsed = JSON.parse(json);
                  const { type, data } = parsed;

                  switch (type) {
                    case "reset":
                      setIntent(undefined);
                      setResults([]);
                      setFullResults([]);
                      setFindings([]);
                      setOverview("");
                      intentRef.current = undefined;
                      resultsRef.current = [];
                      fullResultsRef.current = [];
                      fullFindings.current = [];
                      fullOverview.current = "";
                      updateStatus(data);
                      break;
                    case "status":
                      updateStatus(data);
                      break;
                    case "intent_loaded":
                      setIntent(data);
                      intentRef.current = data;
                      break;
                    case "resources_loaded":
                      setResults(data);
                      resultsRef.current = data;
                      updateStatus("Analyzing resources...");
                      break;
                    case "full_results_loaded":
                      setFullResults(data);
                      fullResultsRef.current = data; // Store for later scoring
                      updateStatus("Analyzing resources...");

                      // Fire callback for full results
                      callbacksRef.current?.onFullResultsLoaded?.({
                        fullResults: data,
                      });
                      break;
                    case "findings_chunk":
                      fullFindings.current = [...fullFindings.current, ...data];
                      if (!fullFindings.current) {
                        return;
                      }
                      setFindings(fullFindings.current);

                      // Fire throttled streaming update for selected results
                      fireSelectedResultsUpdate(true); // partial = true, will be throttled
                      break;
                    case "overview_chunk":
                      fullOverview.current = fullOverview.current + data;
                      if (!fullOverview.current) {
                        return;
                      }
                      setOverview(fullOverview.current);
                      break;
                    case "glimpse_chunk": {
                      fullGlimpseResult.current += data;
                      const partialResult = parsePartialGlimpseResult(fullGlimpseResult.current);
                      if (partialResult) {
                        setGlimpseResult(partialResult);

                        // Fire throttled streaming update for selected results
                        fireSelectedResultsUpdate(true); // partial = true, will be throttled
                      }
                      break;
                    }
                    case "completed": {
                      terminalEventReceived = true;
                      setLoading(false);
                      setComplete(true);
                      updateStatus("Analysis complete.");

                      // Fire final selected results (force immediate, not throttled)
                      fireSelectedResultsUpdate(false, true); // partial = false, force immediate

                      // Update history
                      const newHistoryItem: ISpyglassHistoryItem = {
                        query: query,
                        intent: intentRef.current?.intent || "General inquiry",
                        response: deepAnalysis ? fullOverview.current : fullGlimpseResult.current,
                      };
                      setHistory((prev) => [...prev, newHistoryItem]);

                      if (autosave && !deepAnalysis) {
                        // Pass data directly to save to avoid stale state in closure
                        await saveRef.current(true);
                      }

                      // Fire search end callback
                      callbacksRef.current?.onSearchEnd?.({ complete: true });
                      break;
                    }
                    case "error":
                      terminalEventReceived = true;
                      setError(data);
                      setLoading(false);
                      updateStatus(null);
                      callbacksRef.current?.onSearchEnd?.({ complete: false, error: data });
                      break;
                    case "cancelled":
                      terminalEventReceived = true;
                      setLoading(false);
                      setComplete(false);
                      updateStatus("Deep Focus run cancelled.");
                      callbacksRef.current?.onSearchEnd?.({
                        complete: false,
                        error: "Cancelled",
                      });
                      break;
                  }
                }
              }
            }

            if (done) {
              break;
            }
          }

          if (!terminalEventReceived) {
            throw new Error("Spyglass stream ended before a terminal event.");
          }
        };

        await processStream();
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") {
          if (searchGeneration === searchGenerationRef.current) {
            setLoading(false);
            updateStatus(null);
            callbacksRef.current?.onSearchEnd?.({ complete: false, error: "Aborted" });
          }
          return;
        }
        if (searchGeneration !== searchGenerationRef.current) {
          return;
        }
        console.error("Search failed:", error);
        setLoading(false);
        const errorMsg = "An error occurred during the analysis.";
        setError(errorMsg);
        updateStatus(null);
        callbacksRef.current?.onSearchEnd?.({
          complete: false,
          error: errorMsg,
        });
      }
    },
    [fireSelectedResultsUpdate, history, updateStatus]
  );

  const search = useCallback(
    (searchArgs: ISearchArgs, autosave?: boolean) => runSearch(searchArgs, autosave),
    [runSearch]
  );

  const resume = useCallback(
    async (durableRunId: string) => {
      const response = await api.get<{ data: SpyglassRun }>(
        `/search/spyglass/runs/${encodeURIComponent(durableRunId)}`
      );
      const run = response.data.data;
      callbacksRef.current?.onRunLoaded?.(run);
      await runSearch(
        {
          query: run.query,
          deepAnalysis: true,
          scope: run.configuration.scope,
          rabbithole: run.configuration.rabbithole,
          tags: run.configuration.tags,
          date: run.configuration.date,
          history: run.configuration.history,
        },
        false,
        durableRunId
      );
    },
    [runSearch]
  );

  const cancel = useCallback(async () => {
    if (!runId) return;
    await api.post(`/search/spyglass/runs/${encodeURIComponent(runId)}/cancel`);
  }, [runId]);

  const save = useCallback(
    async (force?: boolean) => {
      // Use refs for latest data
      if ((!complete && !force) || !searchArgsRef.current) {
        console.error("Cannot save an incomplete or non-existent analysis.");
        return;
      }

      try {
        await api.post(`/search/spyglass/save`, {
          baseQuery: searchArgsRef.current.query,
          scope: resultsRef.current.map((r) => r.id.toString()),
          isDeepAnalysis: searchArgsRef.current.deepAnalysis,
          searchPerformed: !searchArgsRef.current.scope || searchArgsRef.current.scope.length === 0,
          intent: intentRef.current,
          results: resultsRef.current,
          findings: fullFindings.current,
          overview: searchArgsRef.current.deepAnalysis
            ? fullOverview.current
            : fullGlimpseResult.current,
        });
      } catch (error) {
        console.error("Failed to save analysis:", error);
      }
    },
    [complete]
  );

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

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
    return results?.reduce((acc, curr) => {
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
    history,
    results,
    fullResults,
    findings,
    runId,
    search,
    resume,
    cancel,
    save,
    citationMap,
    resultsMap,
    reset: resetState,
    uninitialize,
  } satisfies ISpyglassServiceReturn;
}
