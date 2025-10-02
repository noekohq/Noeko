import styles from "./Constellation.module.scss";
import { IWidgetConfig } from "../index.d";
import GraphContainer from "../../Graph/Graph";
import { useSearch } from "../../../contexts/SearchContext";
import { useEffect, useRef } from "react";
import useFetch from "../../../hooks/useFetch";
import { IConnectable } from "../../../../app/services/Graph";

export default function Constellation() {
  const {
    global: {
      results: { get: searchResults },
      query: { get: searchQuery },
    },
  } = useSearch();
  const {
    data: recent,
    load: loadRecent,
    loading: loadingRecent,
  } = useFetch<undefined, IConnectable[]>({
    url: `/insights/recent`,
    method: "GET",
  });

  useEffect(() => {
    if (!searchResults?.length && !searchQuery.length) {
      console.log("Loading recent...");
      loadRecent();
    }
  }, [searchResults]);

  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className={styles.container}>
      <GraphContainer
        width={containerRef.current?.clientWidth}
        height={containerRef.current?.clientHeight}
        graph={{
          nodes: [],
          edges: [],
        }}
      />
    </div>
  );
}

export const config: IWidgetConfig = {
  columns: {
    default: 8,
    min: 8,
    max: 12,
  },
};
