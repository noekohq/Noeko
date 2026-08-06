import { useQuery, UseQueryOptions, QueryKey } from "@tanstack/react-query";
import { api } from "@infrastructure/api/client";
import { DefaultResponse } from "@/declarations/server";

export interface UseApiQueryConfig<TData> {
  url: string | null;
  queryKey: QueryKey;
  query?: Record<string, unknown>;
  options?: Omit<UseQueryOptions<TData, Error, TData, QueryKey>, "queryKey" | "queryFn">;
}

export function useApiQuery<TData>({ url, queryKey, query, options }: UseApiQueryConfig<TData>) {
  return useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      if (!url) throw new Error("URL is required but was null");

      const res = await api.get<DefaultResponse<TData>>(url, {
        params: query,
        signal,
      });

      return res.data.data as TData;
    },
    enabled: !!url && (options?.enabled ?? true),
    ...options,
  });
}
