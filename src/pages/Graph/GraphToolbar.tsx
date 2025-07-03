import { useCallback, useEffect } from "react";
import { IDBGraph } from "../../../app/database/models/ideas";
import { ISearchResult } from "../../../app/services/Search";
import styles from "./GraphToolbar.module.scss";
import { INode } from "../../declarations/graph";
import { useGraph } from "../../contexts/GraphContext";

import { useAuth } from "../../contexts/AuthContext";
import { useSearch } from "../../contexts/SearchContext";
import Search from "../../components/Search/Search";

type GraphToolbarProps = {
  nodes: INode[];
  flags: IDBGraph["flags"];
};

export const GraphToolbar = ({ nodes, flags }: GraphToolbarProps) => {
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
      filter: (result) => filteredResults.includes(result.id.toString()),
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
};
