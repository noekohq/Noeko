import { useCallback, useState } from "react";
import { useSearch } from "../../contexts/SearchContext";
import styles from "./Search.module.scss";
import { SearchBar } from "./SearchBar";
import { ISearchResult } from "../../../app/services/Search";
import { Space, Text, UnstyledButton } from "@mantine/core";
import { Link } from "react-router";
import { getNodeTitle } from "../../utils/graph";
import Match from "../Utils/Match";
import { getSearchResultPreview } from "../../utils/search";

export default function Search() {
  const [loading, setLoading] = useState(false);

  const {
    results: { get: searchResults, set: setResults },
  } = useSearch();

  const handleResultsClear = useCallback(() => {
    setResults(null);
  }, []);

  return (
    <div className={styles.searchWrapper}>
      <SearchBar
        onResultsClear={handleResultsClear}
        onSearchStart={() => {
          setLoading(true);
        }}
        onSearchEnd={() => {
          setLoading(false);
        }}
        onShortcuts={[{ key: "/" }, { meta: true, key: "k" }]}
        placeholder="Press / to search..."
      />
      {searchResults && (
        <>
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
                <UnstyledButton key={s.id.toString()}>
                  <Text fw="bold" c="gray">
                    {getNodeTitle(s.value)}
                  </Text>
                  <Text c="dimmed">
                    <Match
                      opener="->"
                      closer="<-"
                      match={(content) => {
                        return (
                          <span className={styles.highlight}>{content}</span>
                        );
                      }}
                    >
                      {getSearchResultPreview(s) || "No preview available."}
                    </Match>
                  </Text>
                </UnstyledButton>
              </Link>
            );
          })}
        </>
      )}
    </div>
  );
}
