import { useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { IDBGraph } from "../../../app/database/models/ideas";
import { ISearchResult } from "../../../app/services/Search";
import { Text, Space, Container, Card } from "@mantine/core";
import styles from "./GraphToolbar.module.scss";
import { INode } from "../../declarations/graph";
import { useGraph } from "../../contexts/GraphContext";

import { useAuth } from "../../contexts/AuthContext";
import { userIsSuperuser } from "../../utils/user";
import { useLayout } from "../../contexts/LayoutContext";
import { SearchBar } from "../../components/Search/SearchBar";
import { useSearch } from "../../contexts/SearchContext";
import { getNodeTitle } from "../../utils/graph";
import Match from "../../components/Utils/Match";
import { getSearchResultPreview } from "../../utils/search";
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

  const {
    rightSidebar: { opened: rightSidebarOpened },
  } = useLayout();

  return (
    <div className={`${styles.ui}`}>
      {rightSidebarOpened && (
        <div className={styles.searchWrapper}>
          <Search />
        </div>
      )}
    </div>
  );
};
