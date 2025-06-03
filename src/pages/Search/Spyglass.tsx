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
} from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/LeftSidebar";
import RightSidebar from "../../components/UI/RightSidebar";
import { SearchBar } from "../../components/Search/SearchBar";
import { Link, useNavigate } from "react-router";
import { getNodeAsIdeaOrNull, getNodeTitle } from "../../utils/graph";
import { ArrowRight } from "@phosphor-icons/react";
import { useCallback, useRef, useState } from "react";
import { useSearch } from "../../contexts/SearchContext";
import styles from "./Spyglass.module.scss";
import { getSearchResultPreview } from "../../utils/search";
import {
  ISearchOverview,
  ISearchResultValue,
} from "../../../app/services/Search";
import {
  formatMillisecondsToSecondsString,
  markdownToHtml,
  numberToLetter,
  sanitizeMarkdownForDescription,
} from "../../utils/formatting";
import { DetailedIdeaCard } from "../../components/Display/Ideas/IdeaCards";
import {
  IdeaArtifact,
  IdeaTag,
} from "../../components/Display/Ideas/IdeaCardTypes";
import LangtonsAntLoader from "../../components/Utils/Loading/AntLoader";
import Match from "../../components/Utils/Match";
import { generateTextFragmentHashFromText } from "../../utils/textFragment";

type IResultsMap = Record<string, ISearchResultValue>;

type ICitationMap = Record<
  string,
  {
    index: number;
    excerpts: string[];
  }
>;

export default function Spyglass() {
  const {
    global: {
      results: { get: searchResults, set: setResults },
      query: { get: searchQuery }, // searchQuery is not directly used in the JSX, but fine to keep
      loading: { get: loadingSearch },
      overview: { get: overview, set: setOverview },
    },
  } = useSearch();

  const startRef = useRef<Date>();
  const [timeTook, setTimeTook] = useState<number>();

  const handleResultsClear = useCallback(() => {
    setResults(null);
    setOverview(null);
  }, [setResults]);

  const getResultsMap = () => {
    return searchResults?.reduce((acc, curr, i) => {
      acc[curr.id.toString()] = curr.value;
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

  // if has citation, bubble to top, otherwise keep original order
  const sortedSearchResults = searchResults?.sort((a, b) => {
    const aHasCitation = !!citationMap[a.id.toString()];
    const bHasCitation = !!citationMap[b.id.toString()];

    // If both have citations, sort by citation index (ascending)
    if (aHasCitation && bHasCitation) {
      return (
        citationMap[a.id.toString()].index - citationMap[b.id.toString()].index
      );
    }

    // If only a has citation, a comes first
    if (aHasCitation && !bHasCitation) {
      return -1;
    }

    // If only b has citation, b comes first
    if (!aHasCitation && bHasCitation) {
      return 1;
    }

    // If neither has citation, maintain original order
    return 0;
  });

  const navigate = useNavigate();

  const [loadingText, setLoadingText] = useState<string>("");
  const updateLoadingText = useCallback(() => {
    setLoadingText("Searching your ideas...");
    setTimeout(() => {
      setLoadingText("Analyzing your ideas...");
    }, 1000);
  }, []);

  return (
    <PageWrapper>
      <LeftSidebar />
      <Container w="100%" pt="lg" className={styles.spyglass}>
        <Stack gap="md">
          <Group>
            <Title order={1}>Spyglass</Title>
          </Group>
          <SearchBar
            onResultsClear={handleResultsClear}
            onSearchStart={() => {
              startRef.current = new Date();
              updateLoadingText();
            }}
            onSearchEnd={() => {
              if (startRef.current) {
                setTimeTook(new Date().getTime() - startRef.current.getTime());
              }
            }}
            onShortcuts={[{ key: "/" }, { meta: true, key: "k" }]}
            placeholder="Press / to search..."
            withOverview
          />
          {!loadingSearch && !searchResults && (
            <Group>
              <Text c="dimmed">Ask your ideas anything...</Text>
            </Group>
          )}
          {loadingSearch && (
            <Group justify="center">
              <Box pos="relative" w="100%" h="50vh">
                <Text c="dimmed">{loadingText}</Text>
                <LangtonsAntLoader withOverlay />
              </Box>
            </Group>
          )}
          {searchResults && (
            <>
              <Grid>
                <Grid.Col>
                  <Space my="sm" />
                </Grid.Col>
                <Grid.Col>
                  {overview &&
                    overview.overview && ( // Ensure overview and overview.overview exist
                      <Card withBorder radius="lg">
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
                {overview && (
                  <Grid.Col>
                    <Divider my="sm" />
                  </Grid.Col>
                )}
                <Grid.Col>
                  <Title order={3}>Results...</Title>
                </Grid.Col>
                <Grid.Col>
                  <Text c="dimmed" size="sm">
                    Found and analyzed {searchResults.length} result
                    {searchResults.length === 1 ? "" : "s"}{" "}
                    {timeTook
                      ? `in ${formatMillisecondsToSecondsString(timeTook)}`
                      : ""}
                  </Text>
                </Grid.Col>
                <Grid.Col>
                  <Grid>
                    {sortedSearchResults?.map((s, i) => {
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
                                        navigate(`/idea/${idea.id.toString()}`);
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
                                        ;
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
                                        <span className="highlight">{m}</span>
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
            </>
          )}
        </Stack>
      </Container>
      <RightSidebar />
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
      <Text c="gray.7" size="sm" fw="bold">
        AT A GLANCE
      </Text>
      <div
        dangerouslySetInnerHTML={{
          __html: markdownToHtml(overview.overview),
        }}
      />
      <Space my="sm" />
      <Text c="gray.7" size="sm" fw="bold">
        SOURCES
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
