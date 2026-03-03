import { useApiQuery } from "@/core/hooks/useApiQuery";
import { IRabbithole } from "../../../../shared/types/rabbithole";

type IUseRabbitholesArgs = Record<string, unknown>;

interface IUseRabbitholesReturn {
  all: { data: IRabbithole[]; loading: boolean };
}

export const rabbitholeKeys = {
  all: ["tags"] as const,
  detail: (id: string) => [...rabbitholeKeys.all, id] as const,
  things: (id: string) => [...rabbitholeKeys.detail(id), "things"] as const,
  suggestions: (id: string) => [...rabbitholeKeys.detail(id), "suggestions"] as const,
};

export default function useRabbitholes(): IUseRabbitholesReturn {
  const { data: rabbitholes, isLoading: isLoadingRabbitholes } = useApiQuery<IRabbithole[]>({
    url: "/rabbitholes",
    queryKey: rabbitholeKeys.all,
  });

  return {
    all: {
      data: rabbitholes ?? [],
      loading: isLoadingRabbitholes,
    },
  };
}
