import { useCallback, useRef, useState } from "react";
import { getAccessToken, serverLocation } from "../server/api";
import { IFinding } from "../../app/services/Spyglass";
import { IConnectable } from "../../app/services/Graph";

interface ISpyglassServiceState {
  loading: boolean;
  complete: boolean;
  error: string | null;
  results: IConnectable[];
  findings: IFinding[];
  overview: string;
  status: string | null;
}

const initialState: ISpyglassServiceState = {
  loading: false,
  complete: false,
  error: null,
  results: [],
  findings: [],
  overview: "",
  status: null,
};

interface ISearchArgs {
  query: string;
  scope?: string[];
  deepAnalysis: boolean;
}

export function useSpyglassService() {
  const [state, setState] = useState<ISpyglassServiceState>(initialState);
  const searchArgsRef = useRef<ISearchArgs | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const resetState = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState(initialState);
    searchArgsRef.current = null;
  }, []);

  const search = useCallback(
    async ({ query, scope, deepAnalysis }: ISearchArgs) => {
      resetState();
      setState((s) => ({
        ...s,
        loading: true,
        status: "Initiating analysis...",
      }));
      searchArgsRef.current = { query, scope, deepAnalysis };
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
            body: JSON.stringify({ query, scope, deepAnalysis }),
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
                      setState((s) => ({ ...s, status: data }));
                      break;
                    case "resources_loaded":
                      setState((s) => ({
                        ...s,
                        results: data,
                        status: "Analyzing resources...",
                      }));
                      break;
                    case "findings_chunk":
                      setState((s) => ({
                        ...s,
                        findings: [...s.findings, ...data],
                      }));
                      break;
                    case "overview_chunk":
                      setState((s) => ({ ...s, overview: s.overview + data }));
                      break;
                    case "completed":
                      setState((s) => ({
                        ...s,
                        loading: false,
                        complete: true,
                        status: "Analysis complete.",
                      }));
                      break;
                    case "error":
                      setState((s) => ({ ...s, loading: false, error: data }));
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
          console.log("Search aborted");
          return;
        }
        console.error("Search failed:", error);
        setState((s) => ({
          ...s,
          loading: false,
          error: "An error occurred during the analysis.",
        }));
      }
    },
    [resetState],
  );

  const save = useCallback(async () => {
    if (!state.complete || !searchArgsRef.current) {
      console.error("Cannot save an incomplete or non-existent analysis.");
      return;
    }

    try {
      // The `api` object from `../server/api` handles auth automatically
      await fetch(`${serverLocation}/api/search/spyglass/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAccessToken()}`,
        },
        credentials: "include",
        body: JSON.stringify({
          baseQuery: searchArgsRef.current.query,
          scope: searchArgsRef.current.scope || [],
          isDeepAnalysis: searchArgsRef.current.deepAnalysis,
          searchPerformed:
            !searchArgsRef.current.scope ||
            searchArgsRef.current.scope.length === 0,
          results: state.results,
          findings: state.findings,
          overview: state.overview,
        }),
      });
    } catch (error) {
      console.error("Failed to save analysis:", error);
    }
  }, [state]);

  return {
    ...state,
    search,
    save,
    reset: resetState,
  };
}
