import { useNavigate, useParams } from "react-router";
import PageWrapper from "../../../components/Layout/PageWrapper";
import LeftSidebar from "../../../components/UI/Layout/Left";
import RightSidebar from "../../../components/UI/Layout/Right";
import {
  Accordion,
  ActionIcon,
  Container,
  Divider,
  Grid,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useSpyglassRecord } from "../hooks/useSpyglass";
import {
  capitalize,
  numberToLetter,
  sanitizeMarkdownForDescription,
} from "../../../utils/formatting";
import { generateTextFragmentHashFromText } from "../../../utils/textFragment";
import { getNodeAsIdeaOrNull } from "../../../utils/graph";
import { CompactIdeaCard } from "../../../components/Display/Ideas/IdeaCards";
import Match from "../../../components/Utils/Match";
import { getSearchResultPreview } from "../../../utils/search";

import styles from "./Record.module.scss";
import OverviewParser from "../../../components/Utils/Spyglass/OverviewParser";
import { DisplayOverview } from "../../../components/Utils/Spyglass/Overview";
import Content from "../../../components/UI/Layout/Content";

export default function SpyglassRecord() {
  const { spyglassId } = useParams<{ spyglassId: string }>();

  const { spyglass, resultMap, citationMap, loading } = useSpyglassRecord({
    spyglassId,
  });

  const overview = spyglass?.analysis;
  const baseQuery = spyglass?.baseQuery;
  const results = spyglass?.fullResults;

  const citations = results?.filter((r) => {
    const hasCitation = !!citationMap[r.id.toString()];
    return hasCitation;
  });

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

  return (
    <PageWrapper>
      <LeftSidebar>
        <LeftSidebar.Open>
          {citations &&
            citations.length < 1 &&
            results &&
            results.length > 0 && (
              <Text c="dimmed" size="sm">
                No findings yet...
              </Text>
            )}
          {citations && citations.length > 0 && (
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
          {results && results.length < 1 && (
            <Text c="dimmed" size="sm">
              No results yet...
            </Text>
          )}
          {results && results.length > 0 && (
            <Stack>
              <Title order={3}>All Results...</Title>
              <Accordion>
                {sortedSearchResults &&
                  sortedSearchResults.map((s, i) => {
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
      </LeftSidebar>
      <Content>
        <Grid>
          <Grid.Col>
            <Text className={styles.queryHeader} size="lg" mb="lg" fs="italic">
              {spyglass?.baseQuery
                ? capitalize(spyglass?.baseQuery)
                : "No title"}
            </Text>
          </Grid.Col>
          {overview && (
            <Grid.Col>
              {overview &&
                overview.overview &&
                baseQuery &&
                results && ( // Ensure overview and overview.overview exist
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
            </Grid.Col>
          )}
        </Grid>
      </Content>
      <RightSidebar />
    </PageWrapper>
  );
}
