import { useEffect, useState } from "react";
import {
  ISearchOverview,
  type ISearchResult,
} from "../../../../app/services/Search";
import { api } from "../../../server/api";

interface IUseSpyglassArgs {
  query: string;
}

interface IUseSpyglassReturn {
  results: ISearchResult[];
  loadingResults: boolean;
  analysis: ISearchOverview;
  loadingAnalysis: boolean;
  statusText: string;
}

export default function useSpyglass({ query }: IUseSpyglassArgs) {
  const [listening, setListening] = useState<boolean>(false);
  const [spyglassId, setSpyglassId] = useState<string | null>(null);
  const [results, setResults] = useState<ISearchResult[]>([]);
  const [analysis, setAnalysis] = useState<ISearchOverview>();
  const [loadingResults, setLoadingResults] = useState<boolean>(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string | null>(null);

  useEffect(() => {
    if (!listening && spyglassId) {
      setListening(true);
      const eventSource = new EventSource(
        `/api/search/spyglass/sse?spyglassId=${spyglassId}`,
      );
    }
  }, [listening, spyglassId]);

  const initialize = async (query: string) => {
    try {
      setStatusText("Searching your ideas...");
      const response = await api.post("/search/spyglass/initialize", {
        query,
      });

      const id = response.data.id;
      setSpyglassId(id);
    } catch (error) {
      console.error(error);
    }
  };

  return {
    results,
  } as {
    results: ISearchResult[];
  };
}
