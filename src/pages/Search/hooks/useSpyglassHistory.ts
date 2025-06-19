import { useEffect } from "react";
import { ISpyglassSearch } from "../../../../app/database/models/search";
import useFetch from "../../../hooks/useFetch";

interface IUseSpyglassHistoryReturn {
  history: ISpyglassSearch[];
}

export default function useSpyglassHistory() {
  const { data: spyglassHistory, load: fetchHistory } = useFetch<
    undefined,
    ISpyglassSearch[]
  >({ url: "/search/spyglass/history", method: "GET" });

  useEffect(() => {
    fetchHistory();
  }, []);

  return {
    history: spyglassHistory || [],
  };
}
