import { useCallback, useMemo, useRef, useState } from "react";
import { useSearch } from "../../contexts/SearchContext";
import { SearchBar } from "./SearchBar";
import {
  Button,
  Card,
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
import { getOS } from "../../utils/platform";
import { useLayout } from "../../contexts/LayoutContext";
import styles from "./Search.module.scss";
import { Link } from "react-router";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { ISafeIdea } from "../../../app/database/models/ideas";
import { useAuth } from "../../contexts/AuthContext";
import IdeaCard, { IIdeaAction } from "../Display/Ideas/Interactions/IdeaCard";
import useRabbithole from "../../hooks/useRabbithole";
import { RabbitholeIcon } from "../Utils/Icons/Icons";

interface ISearchProps {
  resultActions?: ((idea: ISafeIdea) => IIdeaAction)[];
  resultFilter?: (id: string) => boolean;
  ignoreRabbithole?: boolean;
}

export default function Search({
  resultActions,
  resultFilter,
  ignoreRabbithole,
}: ISearchProps) {
  const [loading, setLoading] = useState(false);
  const os = getOS();
  const ctrl = os !== "macos";
  const meta = os === "macos";
  const primaryKey = os === "macos" ? "⌘" : "Ctrl";

  const { isSuperuser } = useAuth();

  const { isMobile } = useLayout();

  const { currentRabbithole } = useRabbithole();
  const withinRabbithole = ignoreRabbithole ? false : !!currentRabbithole;

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

  return (
    <div className={styles.searchWrapper}>
      <SearchBar
        ignoreRabbithole={ignoreRabbithole}
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
            <Group gap="xs">
              {withinRabbithole && (
                <RabbitholeIcon size={12} color="var(--mantine-color-dimmed)" />
              )}
              <Text c="dimmed" size="xs">
                Search{" "}
                {withinRabbithole ? (
                  <>"{currentRabbithole?.name}"</>
                ) : (
                  "anything..."
                )}
              </Text>
              <Text c="dimmed" size="xs"></Text>
            </Group>
          </>
        )}
      {filteredResults && (
        <Container w="100%" className={styles.results} p="0">
          <Space my="lg" />
          <Text c="dimmed" size="sm">
            Found {filteredResults.length} result
            {filteredResults.length === 1 ? "" : "s"}
            {isSuperuser && !!timeTaken ? ` in ${timeTaken}s` : ""}
            {withinRabbithole ? ` in "${currentRabbithole?.name}"` : ""}
          </Text>
          <Space my="sm" />
          {!filteredResults.length && <Text size="sm">No results :(</Text>}
          <Stack>
            {filteredResults
              ?.map((s, i) => {
                const isBest = i === 0;
                const idea = getNodeAsIdeaOrNull(s.value);
                if (!idea) {
                  return null;
                }
                return (
                  <IdeaCard
                    key={s.id.toString()}
                    idea={idea}
                    description={
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
                    details={
                      <>
                        <Card withBorder radius="lg">
                          <Text size="xs" fw="bold" c="dimmed">
                            Matching Content
                          </Text>
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
                        </Card>
                        <div
                          dangerouslySetInnerHTML={{ __html: idea.content }}
                        />
                      </>
                    }
                    actions={resultActions?.map((r) => {
                      return r(idea);
                    })}
                    actionsVisible={isMobile ? 1 : undefined}
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
