import { useCallback, useState } from "react";
import { useSearch } from "../../contexts/SearchContext";
import styles from "./Search.module.scss";
import { SearchBar } from "./SearchBar";
import {
  Container,
  Group,
  Space,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { Link } from "react-router";
import {
  getNodeAsIdeaOrNull,
  getNodesAsIdeas,
  getNodeTitle,
} from "../../utils/graph";
import Match from "../Utils/Match";
import { getSearchResultPreview } from "../../utils/search";
import { Star } from "@phosphor-icons/react";
import { CompactIdeaCard } from "../Display/Ideas/IdeaCards";

export default function Search() {
  const [loading, setLoading] = useState(false);

  const {
    global: {
      results: { get: searchResults, set: setResults },
    },
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
      {!searchResults && !loading && (
        <>
          <Space my="lg" />
          <Text c="dimmed" size="xs">
            Search anything...
          </Text>
        </>
      )}
      {searchResults && (
        <Container w="100%" className={styles.results} p="0">
          <Space my="lg" />
          <Text c="dimmed" size="sm">
            Found {searchResults.length} result
            {searchResults.length === 1 ? "" : "s"}...
          </Text>
          <Space my="sm" />
          <Stack>
            {searchResults
              ?.map((s, i) => {
                const isBest = i === 0;
                const idea = getNodeAsIdeaOrNull(s.value);
                if (!idea) {
                  return null;
                }
                return (
                  <CompactIdeaCard
                    key={s.id.toString()}
                    idea={idea}
                    draggable
                    link
                    detailsForHoverCard={
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
                    }
                  />
                );
              })
              .filter((r) => !!r)}
          </Stack>
        </Container>
      )}
    </div>
  );
}
