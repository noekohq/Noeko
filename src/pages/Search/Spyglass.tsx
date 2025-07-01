import {
  Title,
  Text,
  Group,
  Container,
  Stack,
  ActionIcon,
  Button,
  Accordion,
  Divider,
  Flex,
  Badge,
} from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import { Link, useNavigate, useSearchParams } from "react-router";
import { getNodeAsIdeaOrNull, getNodeTitle } from "../../utils/graph";
import { useEffect, useRef, useState } from "react";
import styles from "./Spyglass.module.scss";
import { getSearchResultPreview } from "../../utils/search";
import {
  capitalize,
  numberToLetter,
  sanitizeMarkdownForDescription,
} from "../../utils/formatting";
import { CompactIdeaCard } from "../../components/Display/Ideas/IdeaCards";
import Match from "../../components/Utils/Match";
import { generateTextFragmentHashFromText } from "../../utils/textFragment";
import useSpyglass from "./hooks/useSpyglass";
import Textbox from "./Textbox";
import { useLayout } from "../../contexts/LayoutContext";
import CountUp from "../../components/Utils/Animations/Countup";
import { DisplayOverview } from "../../components/Utils/Spyglass/Overview";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";
import Content from "../../components/UI/Layout/Content";
import Search from "../../components/Search/Search";

export default function Spyglass() {
  const [query, setQuery] = useState<string>("");
  const {
    initialize,
    intent,
    results,
    analysis: overview,
    initialized: spyglassInitialized,
    initializing,
    clear,
    complete,
    resultMap,
    citationMap,
    baseQuery,
    loading,
  } = useSpyglass({ query });

  const hasInitialized = useRef(false);
  useEffect(() => {
    if (spyglassInitialized && !hasInitialized.current) {
      hasInitialized.current = true;
    }
  }, [spyglassInitialized]);

  const initialized = hasInitialized.current;

  const sortedSearchResults = results
    // .filter((r) => {
    //   const hasCitation = !!citationMap[r.id.toString()];
    //   return hasCitation;
    // })
    ?.sort((a, b) => {
      const aHasCitation = !!citationMap[a.id.toString()];
      const bHasCitation = !!citationMap[b.id.toString()];

      if (aHasCitation && bHasCitation) {
        return (
          citationMap[a.id.toString()].index -
          citationMap[b.id.toString()].index
        );
      }

      if (aHasCitation && !bHasCitation) {
        return -1;
      }

      if (!aHasCitation && bHasCitation) {
        return 1;
      }

      return 0;
    });

  const navigate = useNavigate();

  const citations = results.filter((r) => {
    const hasCitation = !!citationMap[r.id.toString()];
    return hasCitation;
  });

  const [showAllResults, setShowAllResults] = useState(false);

  const { isMobile } = useLayout();

  useEffect(() => {
    if (complete) {
      setQuery("");
    }
  }, [complete]);

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
    }
  }, [searchParams]);

  const displayQuery = useRef<string>();

  useEffect(() => {
    if (baseQuery) {
      displayQuery.current = baseQuery;
    } else if (query) {
      displayQuery.current = query;
    }
  }, [baseQuery, query]);

  const queryToShow = () => {
    return displayQuery.current ?? baseQuery ?? query;
  };

  const {
    elements: {
      leftSidebar: {
        mode: { set: setLeftSidebar },
      },
    },
  } = useLayout();

  return (
    <PageWrapper>
      <LeftSidebar>
        <LeftSidebar.Open>
          {citations.length < 1 && results.length > 0 && (
            <Text c="dimmed" size="sm">
              No findings yet...
            </Text>
          )}
          {citations.length > 0 && (
            <>
              <Title order={3} mb="lg">
                Findings in {citations.length} Source
                {citations.length > 1 ? "s" : ""}
              </Title>
              <div className={styles.citationsDisplay}>
                <Group wrap="wrap" gap="xs">
                  {citations.map((c) => {
                    if (!c.value) {
                      return null;
                    }

                    const idea = getNodeAsIdeaOrNull(c.value);
                    const citation = citationMap[c.id.toString()];

                    if (!idea) {
                      return null;
                    }

                    return (
                      <CompactIdeaCard
                        idea={idea}
                        maxTitleLines={2}
                        withBorder
                        cardShadow="none"
                        maxDescriptionLines={3}
                        style={{
                          width: "100%",
                        }}
                        description={`${citation.excerpts.length} reference${citation.excerpts.length > 1 ? "s" : ""} - ${idea.contentPlain?.slice(0, 24)}...`}
                        onCardClick={(e) => {
                          e.preventDefault();
                          navigate(`/idea/${idea.id.toString()}`);
                        }}
                        detailsForHoverCard={
                          <Stack gap="xs">
                            {citation.excerpts.map((excerpt, i) => {
                              return (
                                <Group wrap="nowrap" align="flex-start">
                                  <ActionIcon
                                    variant="subtle"
                                    size="xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(
                                        `/idea/${idea.id}?highlightText=${generateTextFragmentHashFromText(excerpt)}`,
                                      );
                                    }}
                                    style={{ cursor: "pointer" }}
                                  >
                                    <Text size="xs">
                                      {citation?.index}
                                      {numberToLetter(i).toLowerCase()}
                                    </Text>
                                  </ActionIcon>
                                  <Text>
                                    <Match
                                      opener="->"
                                      closer="<-"
                                      match={(m) => {
                                        return (
                                          <span className="highlight">{m}</span>
                                        );
                                      }}
                                    >
                                      {sanitizeMarkdownForDescription(excerpt)}
                                    </Match>
                                  </Text>
                                </Group>
                              );
                            })}
                          </Stack>
                        }
                        artifacts={[
                          {
                            id: "index",
                            content: (
                              <ActionIcon variant="light" size="xs" radius="lg">
                                <Text size="xs">{citation.index}</Text>
                              </ActionIcon>
                            ),
                          },
                        ]}
                      />
                    );
                  })}
                </Group>
              </div>
              <Divider my="lg" />
            </>
          )}
          {results.length < 1 && (
            <Text c="dimmed" size="sm">
              No results yet...
            </Text>
          )}
          {results.length > 0 && (
            <Stack>
              <Title order={3}>All Results...</Title>
              <Accordion>
                {sortedSearchResults.map((s, i) => {
                  if (!s.value) {
                    return;
                  }
                  const hasExcerpts = !!citationMap[s.id.toString()];
                  const citation = hasExcerpts
                    ? citationMap[s.id.toString()]
                    : null;
                  const excerpts = hasExcerpts
                    ? citationMap[s.id.toString()].excerpts
                    : [];
                  const idea = getNodeAsIdeaOrNull(s.value);

                  if (!idea) {
                    return null;
                  }

                  return (
                    <Accordion.Item value={idea.id.toString()}>
                      <Accordion.Control p="0">
                        <Group wrap="wrap">
                          <Text
                            fw={500}
                            size="sm"
                            lineClamp={2}
                            title={idea.title}
                          >
                            {idea.title}
                            {hasExcerpts && (
                              <ActionIcon
                                variant="light"
                                size="xs"
                                onClick={() => {
                                  navigate(`/idea/${idea.id.toString()}`);
                                }}
                                ml="xs"
                              >
                                <Text size="xs">
                                  {citationMap[
                                    s.id.toString()
                                  ].index.toString()}
                                </Text>
                              </ActionIcon>
                            )}
                          </Text>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel p="0">
                        {hasExcerpts ? (
                          <Stack gap="xs">
                            {excerpts.map((excerpt, i) => {
                              return (
                                <Group wrap="nowrap" align="flex-start">
                                  <ActionIcon
                                    variant="subtle"
                                    size="xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(
                                        `/idea/${idea.id}?highlightText=${generateTextFragmentHashFromText(excerpt)}`,
                                      );
                                    }}
                                    style={{ cursor: "pointer" }}
                                  >
                                    <Text size="xs">
                                      {citation?.index}
                                      {numberToLetter(i).toLowerCase()}
                                    </Text>
                                  </ActionIcon>
                                  <Text size="xs" c="dimmed">
                                    <Match
                                      opener="->"
                                      closer="<-"
                                      match={(m) => {
                                        return (
                                          <span className="highlight">{m}</span>
                                        );
                                      }}
                                    >
                                      {sanitizeMarkdownForDescription(excerpt)}
                                    </Match>
                                  </Text>
                                </Group>
                              );
                            })}
                          </Stack>
                        ) : (
                          <Text size="xs" c="dimmed">
                            <Match
                              opener="->"
                              closer="<-"
                              match={(m) => {
                                return <span className="highlight">{m}</span>;
                              }}
                            >
                              {getSearchResultPreview(s) ||
                                "No preview available."}
                            </Match>
                          </Text>
                        )}
                      </Accordion.Panel>
                    </Accordion.Item>
                  );
                })}
              </Accordion>
            </Stack>
          )}
        </LeftSidebar.Open>
        <LeftSidebar.Collapsed>
          {overview.findings.length > 0 && (
            <ActionIcon
              variant="light"
              size="sm"
              radius="md"
              onClick={() => {
                setLeftSidebar("open");
              }}
            >
              <Text size="xs">{overview.findings.length}</Text>
            </ActionIcon>
          )}
        </LeftSidebar.Collapsed>
      </LeftSidebar>
      <Content>
        <Flex
          direction="column"
          gap="0"
          h="100%"
          justify={initialized ? "space-between" : "center"}
        >
          <div
            className={`${styles.scrollableContent} ${initialized ? styles.initialized : ""}`}
          >
            {!initialized && (
              <Title
                ta={initialized ? "left" : "center"}
                className={`${styles.header} ${initialized ? styles.initialized : ""}`}
                order={initialized ? 2 : 1}
                mb="lg"
              >
                Spyglass
              </Title>
            )}
            {(!!initialized || !!initializing) && (
              <Text
                className={styles.queryHeader}
                size="lg"
                mb="lg"
                fs="italic"
              >
                {capitalize(queryToShow())}
              </Text>
            )}
            {initialized && (
              <div
                className={`${styles.preview} ${!!overview.overview.length ? styles.hide : ""}`}
              >
                {results.length <= 0 && (
                  <Text mb="lg">
                    {!!intent && intent.queries?.length > 0 ? (
                      <span>
                        Running <CountUp targetNumber={intent.queries.length} />{" "}
                        search{intent.queries.length === 1 ? "" : "es"}...
                      </span>
                    ) : (
                      "Searching your ideas..."
                    )}
                  </Text>
                )}
                {results.length > 0 && (
                  <Text mb="lg">
                    Reading{" "}
                    <Badge variant="light" color="redLight">
                      {<CountUp targetNumber={results.length} />}
                    </Badge>{" "}
                    resource{results.length === 1 ? "" : "s"}...
                  </Text>
                )}
                {Object.entries(citationMap).map(([sourceId, citation]) => {
                  const { excerpts, index } = citation;
                  const result = resultMap[sourceId];
                  return (
                    <Group
                      gap="xs"
                      className={styles.previewItem}
                      key={sourceId}
                    >
                      <ActionIcon variant="subtle" size="md">
                        <Text size="md">({index.toString()})</Text>
                      </ActionIcon>
                      <Text component="p" inline fw="bold">
                        <Badge
                          variant="light"
                          color="redLight"
                          styles={{
                            label: {
                              textTransform: "none",
                            },
                          }}
                        >
                          {result ? getNodeTitle(result) : "Unknown source"}
                        </Badge>
                      </Text>
                      <Text component="span" inline size="xs">
                        {excerpts.length} excerpt
                        {excerpts.length > 1 ? "s" : ""}
                      </Text>
                    </Group>
                  );
                })}
                {overview.findings.length > 0 && (
                  <>
                    <Text className={styles.previewItem} mt="lg">
                      Analyzing results...
                    </Text>
                    <Text className={styles.previewItem}>
                      {overview.findings.length} finding
                      {overview.findings.length === 1 ? "" : "s"}...
                    </Text>
                  </>
                )}
              </div>
            )}
            {overview && overview.overview && (
              <>
                <div className={styles.overviewDisplay}>
                  <DisplayOverview
                    overview={overview}
                    resultsMap={resultMap ?? {}}
                    citationMap={citationMap ?? {}}
                    query={baseQuery}
                    results={results}
                    loading={loading}
                  />
                </div>
              </>
            )}
          </div>
          {!loading && (
            <>
              <div
                className={`${styles.textboxContainer} ${initialized ? styles.initialized : ""}`}
              >
                <Textbox
                  defaultText={query}
                  onSubmit={() => {
                    clear();
                    initialize();
                  }}
                  onChange={(v) => {
                    setQuery(v);
                  }}
                  placeholder="Ask your thoughts anything..."
                  placeholderIfInitialized="Ask another question..."
                  initialized={initialized}
                />
              </div>
              {!initialized && (
                <Group mt="lg" justify="center">
                  <Link to="/spyglass/history">
                    <Button
                      // leftSection={
                      //   <ClockCounterClockwiseIcon weight="bold" size={14} />
                      // }
                      radius="lg"
                      variant="light"
                      color="dark.4"
                      c="dark.2"
                    >
                      History
                    </Button>
                  </Link>
                </Group>
              )}
            </>
          )}
        </Flex>
      </Content>
      {/* <RightSidebar></RightSidebar> */}
      <RightSidebar>
        <RightSidebar.Open>
          <Search />
        </RightSidebar.Open>
      </RightSidebar>
    </PageWrapper>
  );
}
