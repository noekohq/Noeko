import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import type { INode } from "@/declarations/graph";
import type { IConnectableTypes } from "../../../../shared/types/constellation";
import { fetchSemanticNeighborhood } from "./client";
import { buildSemanticOverlay, toFindTraceResults } from "./overlay";
import type {
  SemanticNeighborhoodClientState,
  SemanticNeighborhoodControllerOptions,
  SemanticNeighborhoodOptions,
  SemanticSource,
} from "./types";

const connectableTypes = new Set<IConnectableTypes>(["idea", "source", "task", "excerpt"]);

export function isSemanticSource(
  value: INode | SemanticSource | null | undefined
): value is (INode | SemanticSource) & { type: IConnectableTypes } {
  return !!value && connectableTypes.has(value.type as IConnectableTypes);
}

export function toSemanticSource(
  value: INode | SemanticSource | null | undefined
): SemanticSource | null {
  if (!isSemanticSource(value)) return null;
  return { id: String(value.id), type: value.type };
}

const getError = (error: unknown) => {
  if (isAxiosError<{ message?: string }>(error)) {
    return new Error(error.response?.data?.message || error.message);
  }
  return error instanceof Error ? error : new Error("Unable to load semantic neighbors.");
};

export const semanticNeighborhoodQueryKey = (
  source: SemanticSource | null,
  { filters, limit, threshold, includeConnected }: SemanticNeighborhoodOptions = {}
) =>
  [
    "constellation",
    "semantic-neighborhood",
    source?.id ?? null,
    filters ?? {},
    limit ?? null,
    threshold ?? null,
    includeConnected ?? null,
  ] as const;

export function useSemanticNeighborhoodQuery(
  source: SemanticSource | null,
  options: SemanticNeighborhoodOptions = {}
) {
  const { filters, limit, threshold, includeConnected } = options;

  return useQuery({
    queryKey: semanticNeighborhoodQueryKey(source, {
      filters,
      limit,
      threshold,
      includeConnected,
    }),
    queryFn: ({ signal }) => {
      if (!source) throw new Error("A connectable semantic source is required.");
      return fetchSemanticNeighborhood(
        source.id,
        { filters, limit, threshold, includeConnected },
        signal
      );
    },
    enabled: !!source,
    retry: false,
  });
}

export function useSemanticNeighborhoodController({
  graph,
  initialSource = null,
  filters,
  limit,
  threshold,
  includeConnected,
}: SemanticNeighborhoodControllerOptions) {
  const [source, setSource] = useState<SemanticSource | null>(() =>
    toSemanticSource(initialSource)
  );
  const query = useSemanticNeighborhoodQuery(source, {
    filters,
    limit,
    threshold,
    includeConnected,
  });

  const replaceSource = useCallback((next: INode | SemanticSource | null) => {
    const semanticSource = toSemanticSource(next);
    setSource(semanticSource);
    return !!semanticSource;
  }, []);
  const clear = useCallback(() => setSource(null), []);

  const state = useMemo<SemanticNeighborhoodClientState>(() => {
    if (!source) return { status: "idle", source: null };
    if (query.isPending || query.isFetching) return { status: "loading", source };
    if (query.error) {
      const error = getError(query.error);
      return { status: "error", source, error, message: error.message };
    }
    if (query.data?.status === "embedding_unavailable") {
      return { status: "embedding-unavailable", source, reason: "missing_embedding" };
    }
    if (query.data?.status === "ready") {
      return { status: "ready", source, result: { ...query.data, status: "ready" } };
    }
    return { status: "loading", source };
  }, [query.data, query.error, query.isFetching, query.isPending, source]);

  const overlay = useMemo(
    () => buildSemanticOverlay(graph, source, query.data),
    [graph, query.data, source]
  );
  const findTraceResults = useMemo(
    () => toFindTraceResults(graph, query.data),
    [graph, query.data]
  );

  return {
    source,
    state,
    overlay,
    findTraceResults,
    replaceSource,
    clear,
    refresh: query.refetch,
  };
}
