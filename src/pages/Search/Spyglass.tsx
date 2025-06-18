// Spyglass.tsx
import {
  // ... other Mantine imports
  Card,
  Divider,
  Title,
  Loader,
  Text,
  Grid,
  Group,
  UnstyledButton,
  Container,
  Stack,
  HoverCard,
  ActionIcon,
  Space,
  Box,
  Flex,
  Button,
  Badge,
} from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/LeftSidebar";
import RightSidebar from "../../components/UI/RightSidebar";
import { SearchBar } from "../../components/Search/SearchBar";
import { Link, useNavigate } from "react-router";
import { getNodeAsIdeaOrNull, getNodeTitle } from "../../utils/graph";
import {
  ArrowRight,
  CaretDownIcon,
  CaretUpIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useSearch } from "../../contexts/SearchContext";
import styles from "./Spyglass.module.scss";
import { getSearchResultPreview } from "../../utils/search";
import {
  ISearchOverview,
  ISearchResultValue,
} from "../../../app/services/Search";
import {
  formatDateTime,
  formatMillisecondsToSecondsString,
  markdownToHtml,
  numberToLetter,
  sanitizeMarkdownForDescription,
} from "../../utils/formatting";
import {
  CompactIdeaCard,
  DetailedIdeaCard,
} from "../../components/Display/Ideas/IdeaCards";
import {
  IdeaArtifact,
  IdeaTag,
} from "../../components/Display/Ideas/IdeaCardTypes";
import LangtonsAntLoader from "../../components/Utils/Loading/AntLoader";
import Match from "../../components/Utils/Match";
import { generateTextFragmentHashFromText } from "../../utils/textFragment";
import { getOS } from "../../utils/platform";
import useSpyglass from "./hooks/useSpyglass";
import Textbox from "./Textbox";
import { useLayout } from "../../contexts/LayoutContext";

type IResultsMap = Record<string, ISearchResultValue>;

type ICitationMap = Record<
  string,
  {
    index: number;
    excerpts: string[];
  }
>;

export default function Spyglass() {
  const [query, setQuery] = useState<string>("");
  const {
    initialize,
    results,
    analysis: overview,
    initialized,
    clear,
    statusText,
  } = useSpyglass({ query });

  const getResultsMap = () => {
    return results?.reduce((acc, curr, i) => {
      if (curr.value) {
        acc[curr.id.toString()] = curr.value;
      }
      return acc;
    }, {} as IResultsMap);
  };

  const resultsMap = getResultsMap();

  const buildCitationMap = (): ICitationMap => {
    if (!overview) {
      return {};
    }
    const map: Record<
      string,
      {
        excerpts: string[];
        index: number;
      }
    > = {};
    let currRefNumber = 1;
    for (const finding of overview.findings) {
      if (!(finding.sourceId in map)) {
        map[finding.sourceId] = {
          excerpts: [finding.excerpt],
          index: currRefNumber,
        };
        currRefNumber++;
      } else {
        map[finding.sourceId].excerpts.push(finding.excerpt);
      }
    }
    return map;
  };

  const citationMap = buildCitationMap();

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

  return (
    <PageWrapper>
      <LeftSidebar />
      <Container
        w="100%"
        py="lg"
        className={`${styles.spyglass} ${initialized ? styles.initialized : ""}`}
      >
        <Grid>
          {!initialized && (
            <Grid.Col span={{ sm: 12 }}>
              <Title
                ta={initialized ? "left" : "center"}
                className={`${styles.header} ${initialized ? styles.initialized : ""}`}
                order={initialized ? 2 : 1}
              >
                Spyglass
              </Title>
            </Grid.Col>
          )}
          <Grid.Col span={{ sm: 12 }}>
            <div
              className={`${styles.textboxContainer} ${initialized ? styles.initialized : ""}`}
            >
              <Textbox
                onSubmit={() => {
                  clear();
                  initialize();
                }}
                onChange={(v) => {
                  setQuery(v);
                }}
                placeholder="Ask your thoughts..."
                initialized={initialized}
              />
            </div>
          </Grid.Col>
          {initialized && statusText && (
            <Grid.Col>
              <Text c="dimmed" size="sm" ta="center">
                {statusText}
              </Text>
              {!overview && (
                <Box h="30vh">
                  <LangtonsAntLoader withOverlay cellSize={10} />
                </Box>
              )}
            </Grid.Col>
          )}
          {overview && (
            <Grid.Col>
              {overview &&
                overview.overview && ( // Ensure overview and overview.overview exist
                  <Card withBorder radius="lg" className={styles.overview}>
                    <Title order={3} mb="xs">
                      Overview
                    </Title>
                    <div className={styles.overviewDisplay}>
                      <DisplayOverview
                        overview={overview}
                        resultsMap={resultsMap ?? {}}
                        citationMap={citationMap ?? {}}
                      />
                    </div>
                  </Card>
                )}
            </Grid.Col>
          )}
          {citations.length > 0 && (
            <Grid.Col>
              <Title order={3} mb="xs">
                {citations.length} Source{citations.length > 1 ? "s" : ""}
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
                        withBorder={false}
                        cardShadow="none"
                        maxDescriptionLines={3}
                        style={{
                          width: isMobile ? "100%" : "",
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
            </Grid.Col>
          )}
          {results.length > 0 && (
            <>
              {!showAllResults && overview && (
                <>
                  <Space my="lg" />
                  <Grid.Col>
                    <Button
                      size="sm"
                      onClick={() => setShowAllResults(true)}
                      variant="default"
                      rightSection={<CaretDownIcon weight="bold" />}
                      radius="lg"
                    >
                      {results.length} Total Result
                      {results.length > 1 ? "s" : ""}
                    </Button>
                  </Grid.Col>
                </>
              )}
              {showAllResults && (
                <>
                  <Grid.Col>
                    <Card withBorder radius={"lg"}>
                      <Grid>
                        <Grid.Col>
                          <Button
                            size="xs"
                            onClick={() => setShowAllResults(false)}
                            variant="default"
                            rightSection={<CaretUpIcon weight="bold" />}
                            radius="lg"
                          >
                            Hide
                          </Button>
                        </Grid.Col>
                        <Grid.Col>
                          <Title order={3}>All Results...</Title>
                        </Grid.Col>
                        <Grid.Col>
                          <Grid>
                            {sortedSearchResults.map((s, i) => {
                              if (!s.value) {
                                return;
                              }
                              const hasExcerpts =
                                !!citationMap[s.id.toString()];
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
                                <Grid.Col span={12} key={s.id.toString()}>
                                  <DetailedIdeaCard
                                    idea={idea}
                                    onCardClick={(e) => {
                                      e.preventDefault();
                                      navigate(`/idea/${idea.id.toString()}`);
                                    }}
                                    artifacts={
                                      hasExcerpts && [
                                        {
                                          id: s.id.toString(),
                                          content: (
                                            <ActionIcon
                                              variant="light"
                                              size="sm"
                                              onClick={() => {
                                                navigate(
                                                  `/idea/${idea.id.toString()}`,
                                                );
                                              }}
                                            >
                                              {citationMap[
                                                s.id.toString()
                                              ].index.toString()}
                                            </ActionIcon>
                                          ),
                                        } as IdeaArtifact,
                                      ]
                                    }
                                    description={
                                      hasExcerpts ? (
                                        <Stack gap="xs">
                                          {excerpts.map((excerpt, i) => {
                                            return (
                                              <Group
                                                wrap="nowrap"
                                                align="flex-start"
                                              >
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
                                                    {numberToLetter(
                                                      i,
                                                    ).toLowerCase()}
                                                  </Text>
                                                </ActionIcon>
                                                <Text>
                                                  <Match
                                                    opener="->"
                                                    closer="<-"
                                                    match={(m) => {
                                                      return (
                                                        <span className="highlight">
                                                          {m}
                                                        </span>
                                                      );
                                                    }}
                                                  >
                                                    {sanitizeMarkdownForDescription(
                                                      excerpt,
                                                    )}
                                                  </Match>
                                                </Text>
                                              </Group>
                                            );
                                          })}
                                        </Stack>
                                      ) : (
                                        <Text>
                                          <Match
                                            opener="->"
                                            closer="<-"
                                            match={(m) => {
                                              return (
                                                <span className="highlight">
                                                  {m}
                                                </span>
                                              );
                                            }}
                                          >
                                            {getSearchResultPreview(s) ||
                                              "No preview available."}
                                          </Match>
                                        </Text>
                                      )
                                    }
                                  />
                                </Grid.Col>
                              );
                            })}
                          </Grid>
                        </Grid.Col>
                      </Grid>
                    </Card>
                  </Grid.Col>
                </>
              )}
            </>
          )}
        </Grid>
      </Container>
      <RightSidebar defaultClosed={true} />
    </PageWrapper>
  );
}

type IDisplayOverview = {
  overview: ISearchOverview;
  resultsMap: IResultsMap;
  citationMap: ICitationMap;
};

function DisplayOverview({
  overview,
  resultsMap,
  citationMap,
}: IDisplayOverview) {
  const navigate = useNavigate();

  // Helper function to navigate with text fragment
  const navigateWithTextFragment = useCallback(
    (ideaId: string, excerpt?: string) => {
      if (!excerpt) {
        let url = `/idea/${ideaId}`;
        navigate(url);
      } else {
        let url = `/idea/${ideaId}?highlightText=${generateTextFragmentHashFromText(excerpt)}`;
        navigate(url);
      }
    },
    [navigate],
  );
  return (
    <div>
      <div
        dangerouslySetInnerHTML={{
          __html: markdownToHtml(overview.overview),
        }}
      />
      <Space my="sm" />
      <Text c="gray.7" size="sm" fw="bold">
        FINDINGS
      </Text>
      <Text>
        {overview.findings
          .filter((finding) => {
            return finding.sourceId in resultsMap;
          })
          .map((finding) => {
            const { index: citationNumber } = citationMap[finding.sourceId];
            const mappedValue = resultsMap[finding.sourceId];
            const title =
              mappedValue.type === "idea"
                ? mappedValue.title
                : mappedValue.id.toString();

            return (
              <Text component="span" mr="xs">
                <HoverCard width={"400px"} withArrow>
                  <HoverCard.Target>
                    <ActionIcon
                      variant="subtle"
                      size="xs"
                      mr="2px"
                      onClick={() =>
                        navigateWithTextFragment(
                          mappedValue.id.toString(),
                          finding.excerpt,
                        )
                      }
                      style={{ cursor: "pointer" }}
                    >
                      <Text size="xs">({citationNumber})</Text>
                    </ActionIcon>
                  </HoverCard.Target>
                  <HoverCard.Dropdown>
                    <Stack>
                      <UnstyledButton
                        onClick={() =>
                          navigateWithTextFragment(
                            mappedValue.id.toString(),
                            finding.excerpt,
                          )
                        }
                        style={{ textDecoration: "none" }}
                      >
                        <Group>
                          <Text fw="bold" c="gray" size="xs">
                            {title}
                          </Text>
                          <ArrowRight size={14} color="gray" weight="bold" />
                        </Group>
                      </UnstyledButton>
                      <Text size="xs">...{finding.excerpt}...</Text>
                    </Stack>
                  </HoverCard.Dropdown>
                </HoverCard>
                {finding.analysis}
              </Text>
            );
          })}
      </Text>
    </div>
  );
}
