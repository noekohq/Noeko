import { useCallback, useMemo, useRef, useState } from "react";
import { useSearch } from "../../contexts/SearchContext";
import { SearchBar } from "./SearchBar";
import {
  Button,
  Container,
  Group,
  MantineColor,
  Space,
  Stack,
  Text,
} from "@mantine/core";
import { getNodeAsIdeaOrNull } from "../../utils/graph";
import Match from "../Utils/Match";
import { getSearchResultPreview } from "../../utils/search";
import {
  CompactIdeaCard,
  DetailedIdeaCard,
  StandardIdeaCard,
} from "../Display/Ideas/IdeaCards";
import { getOS } from "../../utils/platform";
import { useLayout } from "../../contexts/LayoutContext";
import styles from "./Search.module.scss";
import { Link } from "react-router";
import { ArrowRightIcon, IconProps } from "@phosphor-icons/react";
import { IdeaAction, IIdeaCardsTypes } from "../Display/Ideas/IdeaCardTypes";
import { IIdea, ISafeIdea } from "../../../app/database/models/ideas";
import { useAuth } from "../../contexts/AuthContext";
import { formatDateTime } from "../../utils/formatting";

interface ISearchProps {
  resultActions?: ((idea: ISafeIdea) => IdeaAction)[];
  resultSize?: IIdeaCardsTypes;
  resultFilter?: (id: string) => boolean;
}

export default function Search({
  resultActions,
  resultSize,
  resultFilter,
}: ISearchProps) {
  const [loading, setLoading] = useState(false);
  const os = getOS();
  const ctrl = os !== "macos";
  const meta = os === "macos";
  const primaryKey = os === "macos" ? "⌘" : "Ctrl";

  const { isSuperuser } = useAuth();

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

  const startTimeRef = useRef<number | null>(null);
  const resultsTimeRef = useRef<number | null>(null);

  const filteredResults = useMemo(() => {
    if (!searchResults) return null;
    if (!resultFilter) return searchResults;
    return searchResults.filter((r) => {
      return resultFilter(r.id.toString());
    });
  }, [searchResults, resultFilter]);

  const timeTaken = useMemo(() => {
    if (!startTimeRef.current || !resultsTimeRef.current) return null;
    return ((resultsTimeRef.current - startTimeRef.current) / 1000).toFixed(2);
  }, [startTimeRef.current, resultsTimeRef.current]);

  console.log("Results: ", searchResults);

  return (
    <div className={styles.searchWrapper}>
      <SearchBar
        onResultsClear={handleResultsClear}
        onSearchStart={() => {
          startTimeRef.current = Date.now();
          setLoading(true);
        }}
        onSearchEnd={() => {
          resultsTimeRef.current = Date.now();
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
          <Link
            to={`/spyglass?q=${encodeURIComponent(searchQuery)}`}
            style={{
              textDecoration: "none",
            }}
          >
            <Group c="dark.3" gap="xs">
              <Text size="xs">Open in Spyglass</Text>
              <ArrowRightIcon size={14} />
            </Group>
          </Link>
        </>
      )}
      {!searchQuery &&
        (!searchResults || !filteredResults?.length) &&
        !loading && (
          <>
            <Space my="lg" />
            <Text c="dimmed" size="xs">
              Search anything...
            </Text>
          </>
        )}
      {filteredResults && (
        <Container w="100%" className={styles.results} p="0">
          <Space my="lg" />
          <Text c="dimmed" size="sm">
            Found {filteredResults.length} result
            {filteredResults.length === 1 ? "" : "s"}
            {isSuperuser ? ` in ${timeTaken}s` : "..."}
          </Text>
          <Space my="sm" />
          <Stack>
            {filteredResults
              ?.map((s, i) => {
                const isBest = i === 0;
                const idea = getNodeAsIdeaOrNull(s.value);
                if (!idea) {
                  return null;
                }
                switch (resultSize) {
                  case "standard":
                    return (
                      <StandardIdeaCard
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
                                <span className={styles.highlight}>
                                  {content}
                                </span>
                              );
                            }}
                          >
                            {getSearchResultPreview(s) ||
                              "No preview available."}
                          </Match>
                        }
                        actions={resultActions?.map((r) => {
                          return r(idea);
                        })}
                      />
                    );
                  case "detailed":
                    return (
                      <DetailedIdeaCard
                        key={s.id.toString()}
                        idea={idea}
                        draggable
                        link
                        description={
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
                            {getSearchResultPreview(s) ||
                              "No preview available."}
                          </Match>
                        }
                        actions={resultActions?.map((r) => {
                          return r(idea);
                        })}
                      />
                    );

                  case "compact":
                  default:
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
                                <span className={styles.highlight}>
                                  {content}
                                </span>
                              );
                            }}
                          >
                            {getSearchResultPreview(s) ||
                              "No preview available."}
                          </Match>
                        }
                        actions={resultActions?.map((r) => {
                          return r(idea);
                        })}
                      />
                    );
                }
              })
              .filter((r) => !!r)}
          </Stack>
        </Container>
      )}
    </div>
  );
}
