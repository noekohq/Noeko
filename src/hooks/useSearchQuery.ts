import { showNotification } from "@mantine/notifications";
import {
  IConnectableSearchQuery,
  ISearchResult,
} from "../../app/services/Search";
import { useSearch } from "../contexts/SearchContext";
import { api } from "../server/api";
import useFetch from "./useFetch";
import useRabbithole from "./useRabbithole";
import { useState } from "react";

interface IUseSearchQueryParams {
  ignoreRabbithole?: boolean;
}

interface IUseSearchQueryReturn {
  search: (q: string, params: Partial<IConnectableSearchQuery>) => void;
  loading: boolean;
  complete: boolean;
  results: ISearchResult[] | null;
}

export default function useSearchQuery({
  ignoreRabbithole = false,
}: IUseSearchQueryParams = {}): IUseSearchQueryReturn {
  const [complete, setComplete] = useState(false);

  const { currentRabbithole } = useRabbithole();
  const withinRabbithole = ignoreRabbithole ? false : !!currentRabbithole;
  const {
    global: {
      query: { get: query, set: setQuery },
      results: { set: setResults, get: searchResults },
      loading: { set: setLoading, get: loadingSearch },
    },
  } = useSearch();

  const search = async (
    q: string,
    params: Partial<IConnectableSearchQuery>,
  ) => {
    try {
      const rabbitholeId = ignoreRabbithole
        ? undefined
        : currentRabbithole?.id.toString();
      const body: IConnectableSearchQuery = {
        query,
        rabbithole: rabbitholeId,
        tables: ["idea", "task", "source", "excerpt"],
        searchType: {
          fts: true,
          vector: true,
        },
        vectorSettings: {
          effort: "mid",
        },
        ...params,
      };
      setComplete(false);
      setLoading(true);
      const response = await api.post("/search", {
        ...body,
      });

      const results = response.data.data as ISearchResult[];
      console.log("Results: ", results);
      if (results === undefined || results === null) {
        throw new Error("Results were undefined");
      }
      setComplete(true);
      setResults(results);
    } catch (error) {
      console.error("Error running search query: ", q, params, error);
      showNotification({
        message: "Something went wrong",
      });
      return undefined;
    } finally {
      setLoading(false);
    }
  };

  return {
    search,
    loading: loadingSearch,
    complete,
    results: searchResults,
  };
}
