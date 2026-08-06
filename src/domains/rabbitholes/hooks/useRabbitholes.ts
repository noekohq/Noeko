import { useApiQuery } from "@/core/hooks/useApiQuery";
import { api } from "@infrastructure/api/client";
import { QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { DefaultResponse } from "@/declarations/server";
import {
  IRabbithole,
  IRabbitholeRecommendationPolicy,
} from "../../../../shared/types/rabbithole";

type IUseRabbitholesArgs = Record<string, unknown>;

interface IUseRabbitholesReturn {
  all: { data: IRabbithole[]; loading: boolean };
}

export const rabbitholeKeys = {
  all: ["rabbitholes"] as const,
  lists: () => [...rabbitholeKeys.all, "list"] as const,
  list: (filters: Record<string, unknown> = {}) => [...rabbitholeKeys.lists(), filters] as const,
  details: () => [...rabbitholeKeys.all, "detail"] as const,
  detail: (id: string | null) => [...rabbitholeKeys.details(), id] as const,
  things: (id: string) => [...rabbitholeKeys.detail(id), "things"] as const,
  suggestions: (id: string) => [...rabbitholeKeys.detail(id), "suggestions"] as const,
};

export const reconcileRabbitholeCaches = (
  queryClient: QueryClient,
  rabbithole: IRabbithole,
  options: { addToLists?: boolean } = {}
) => {
  const id = rabbithole.id.toString();
  queryClient.setQueryData<IRabbithole>(rabbitholeKeys.detail(id), (current) => ({
    ...current,
    ...rabbithole,
  }));
  queryClient.setQueriesData<IRabbithole[]>({ queryKey: rabbitholeKeys.lists() }, (current) => {
    if (!current) return current;
    const exists = current.some((item) => item.id.toString() === id);
    if (!exists) return options.addToLists ? [rabbithole, ...current] : current;
    return current.map((item) =>
      item.id.toString() === id ? { ...item, ...rabbithole } : item
    );
  });
};

export const invalidateRabbitholeCaches = (queryClient: QueryClient, id: string) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: rabbitholeKeys.detail(id) }),
    queryClient.invalidateQueries({ queryKey: rabbitholeKeys.lists() }),
  ]);

export const removeRabbitholeFromCaches = async (queryClient: QueryClient, id: string) => {
  queryClient.removeQueries({ queryKey: rabbitholeKeys.detail(id) });
  queryClient.setQueriesData<IRabbithole[]>({ queryKey: rabbitholeKeys.lists() }, (current) =>
    current?.filter((item) => item.id.toString() !== id)
  );
  await queryClient.invalidateQueries({ queryKey: rabbitholeKeys.lists() });
};

export default function useRabbitholes(): IUseRabbitholesReturn {
  const { data: rabbitholes, isLoading: isLoadingRabbitholes } = useApiQuery<IRabbithole[]>({
    url: "/rabbitholes",
    queryKey: rabbitholeKeys.list(),
  });

  return {
    all: {
      data: rabbitholes ?? [],
      loading: isLoadingRabbitholes,
    },
  };
}

export function useRabbitholeQuery(rabbitholeId: string | null) {
  const queryClient = useQueryClient();
  const query = useApiQuery<IRabbithole>({
    url: rabbitholeId ? `/rabbitholes/${rabbitholeId}` : null,
    queryKey: rabbitholeKeys.detail(rabbitholeId),
  });

  useEffect(() => {
    if (query.data) reconcileRabbitholeCaches(queryClient, query.data);
  }, [query.data, queryClient]);

  return query;
}

type RabbitholeUpdate = Partial<
  Pick<IRabbithole, "name" | "description"> & {
    recommendationPolicy: IRabbitholeRecommendationPolicy;
  }
>;

export function useUpdateRabbithole(rabbitholeId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (changes: RabbitholeUpdate) => {
      if (!rabbitholeId) throw new Error("Cannot update a Rabbithole without an ID");
      const response = await api.put<DefaultResponse<IRabbithole>>(
        `/rabbitholes/${rabbitholeId}`,
        changes
      );
      return response.data.data as IRabbithole;
    },
    onSuccess: async (rabbithole) => {
      reconcileRabbitholeCaches(queryClient, rabbithole);
      await invalidateRabbitholeCaches(queryClient, rabbithole.id.toString());
    },
  });
}

export function useGenerateRabbitholeContext(rabbitholeId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (field: "name" | "description") => {
      if (!rabbitholeId) throw new Error("Cannot generate Rabbithole context without an ID");
      const endpoint = field === "name" ? "entitle" : "describe";
      const response = await api.post<DefaultResponse<IRabbithole>>(
        `/rabbitholes/${rabbitholeId}/${endpoint}`
      );
      return response.data.data as IRabbithole;
    },
    onSuccess: async (rabbithole) => {
      reconcileRabbitholeCaches(queryClient, rabbithole);
      await invalidateRabbitholeCaches(queryClient, rabbithole.id.toString());
    },
  });
}
