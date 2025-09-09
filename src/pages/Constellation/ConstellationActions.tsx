import { useCallback, useEffect } from "react";
import { IDBGraph } from "../../../app/database/models/ideas";
import { ISearchResult } from "../../../app/services/Search";
import styles from "./ConstellationActions.module.scss";
import { IGraph, INode } from "../../declarations/graph";
import { useGraph } from "../../contexts/GraphContext";

import { useAuth } from "../../contexts/AuthContext";
import { useSearch } from "../../contexts/SearchContext";
import Search from "../../components/Search/Search";

type IConstellationActionsProps = {
  graphData: IGraph;
};

export default function ConstellationActions({
  graphData,
}: IConstellationActionsProps) {
  const { user } = useAuth();

  const {
    filter: { set: setFilter, clear: clearFilter },
  } = useGraph();

  const {
    global: {
      results: { get: searchResults },
    },
  } = useSearch();

  const handleResults = useCallback((results: ISearchResult[]) => {
    const filteredResults = results.map((r) => r.value.id.toString());
    setFilter({
      filter: (result) => filteredResults.includes(result),
    });
    return filteredResults;
  }, []);

  useEffect(() => {
    if (searchResults) {
      handleResults(searchResults);
    } else {
      clearFilter();
    }
  }, [searchResults, handleResults]);

  return (
    <div className={`${styles.ui}`}>
      <div className={styles.searchWrapper}>
        <Search />
      </div>
    </div>
  );
}
