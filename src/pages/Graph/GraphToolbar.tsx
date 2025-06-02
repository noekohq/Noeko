import { useCallback } from "react";
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

type GraphToolbarProps = {
  nodes: INode[];
  flags: IDBGraph["flags"];
};

export const GraphToolbar = ({ nodes, flags }: GraphToolbarProps) => {
  const navigate = useNavigate();

  const { user } = useAuth();
  const isAdmin = userIsSuperuser(user);

  const {
    filter: { set: setFilter, clear: clearFilter },
    loading: { set: setLoading },
    query: { set: setQuery },
  } = useGraph();

  const {
    results: { get: searchResults, set: setResults },
  } = useSearch();

  const handleResults = useCallback((results: ISearchResult[]) => {
    const filteredResults = results.map((r) => r.value.id.toString());
    setFilter({
      filter: (result) => filteredResults.includes(result.id.toString()),
    });
    return filteredResults;
  }, []);

  const handleResultsClear = useCallback(() => {
    clearFilter();
    setResults(null);
  }, []);

  const {
    rightSidebar: { opened: rightSidebarOpened },
    isMobile,
  } = useLayout();

  return (
    <div className={`${styles.ui}`}>
      {rightSidebarOpened && (
        <div className={styles.searchWrapper}>
          <SearchBar
            onResults={handleResults}
            onResultsClear={handleResultsClear}
            onSearchStart={() => {
              setLoading(true);
            }}
            onSearchEnd={() => {
              setLoading(false);
            }}
            onShortcuts={[{ key: "/" }, { meta: true, key: "k" }]}
          />
          {searchResults && (
            <Container p="0" w="100%" className={styles.searchResults}>
              <Space my="lg" />
              <Text c="dimmed" size="sm">
                Found {searchResults.length} result
                {searchResults.length === 1 ? "" : "s"}...
              </Text>
              <Space my="sm" />
              {searchResults?.map((s, i) => {
                return (
                  <Link
                    key={s.id.toString()}
                    to={`/${s.value.type}/${s.value.id.toString()}`}
                    style={{
                      textDecoration: "none",
                    }}
                    className="searchResult"
                    tabIndex={i}
                  >
                    <Card withBorder>
                      <Text fw="bold" c="gray">
                        {getNodeTitle(s.value)}
                      </Text>
                      <Text c="dimmed">
                        <Match
                          opener="->"
                          closer="<-"
                          match={(content) => {
                            return (
                              <span className={styles.highlight}>
                                {content}
                              </span>
                            );
                          }}
                        >
                          {getSearchResultPreview(s) || "No preview available."}
                        </Match>
                      </Text>
                    </Card>
                  </Link>
                );
              })}
            </Container>
          )}
        </div>
      )}
    </div>
  );
};
