import { useCallback, useState } from "react";
import { useSearch } from "../../contexts/SearchContext";
import { SearchBar } from "./SearchBar";
import { Button, Container, Group, Space, Stack, Text } from "@mantine/core";
import { getNodeAsIdeaOrNull } from "../../utils/graph";
import Match from "../Utils/Match";
import { getSearchResultPreview } from "../../utils/search";
import { CompactIdeaCard } from "../Display/Ideas/IdeaCards";
import { getOS } from "../../utils/platform";
import { useLayout } from "../../contexts/LayoutContext";
import styles from "./Search.module.scss";
import { Link } from "react-router";
import { ArrowRightIcon } from "@phosphor-icons/react";

export default function Search() {
  const [loading, setLoading] = useState(false);
  const os = getOS();
  const ctrl = os !== "macos";
  const meta = os === "macos";
  const primaryKey = os === "macos" ? "⌘" : "Ctrl";

  const { isMobile } = useLayout();

  const {
    global: {
      results: { get: searchResults, set: setResults },
      query: { get: searchQuery },
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
        onShortcuts={[{ key: "/", ctrl, meta }]}
        placeholder={
          isMobile ? "Search..." : `Press ${primaryKey} + / to focus...`
        }
      />
      {!!searchQuery && !searchResults && !loading && (
        <>
          <Space my="lg" />
          <Link to={`/spyglass?q=${encodeURIComponent(searchQuery)}`}>
            <Group>
              <Text size="xs">Open in Spyglass</Text>
              <ArrowRightIcon size={14} />
            </Group>
          </Link>
        </>
      )}
      {!searchQuery && !searchResults && !loading && (
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
