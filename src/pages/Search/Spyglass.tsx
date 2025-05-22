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
  getSize,
  Space,
} from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/LeftSidebar";
import RightSidebar from "../../components/UI/RightSidebar";
import { SearchBar } from "../../components/Search/SearchBar";
import { Link } from "react-router";
import { getNodeTitle } from "../../utils/graph";
import { ArrowRight, Star } from "@phosphor-icons/react";
import Match from "../../components/Utils/Match";
import { useCallback, useRef, useState } from "react";
import { useSearch } from "../../contexts/SearchContext";
import styles from "./Spyglass.module.scss";
import { getSearchResultPreview } from "../../utils/search";
import {
  ISearchOverview,
  ISearchResultValue,
} from "../../../app/services/Search";
import { generateTextFragmentUrl } from "../../utils/dom";

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
    results: { get: searchResults, set: setResults },
    query: { get: searchQuery }, // searchQuery is not directly used in the JSX, but fine to keep
    loading: { get: loadingSearch },
  } = useSearch();

  const [overview, setOverview] = useState<ISearchOverview>();

  const handleResultsClear = useCallback(() => {
    setResults(null);
    setOverview(undefined);
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

  console.log("Results map: ", resultsMap);

  const citationMap = buildCitationMap();

  console.log("Citation map: ", citationMap);

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
              setOverview(undefined);
            }}
            onResults={(_, searchOverview) => {
              setOverview(searchOverview);
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
              <Loader type="bars" size="sm" c="dimmed" />
              <Text c="dimmed" size="sm">
                Searching your ideas...
              </Text>
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
                        <Title order={3}>Overview</Title>
                        <Divider my="xs" />
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
                <Grid.Col>
                  <Divider my="sm" />
                </Grid.Col>
                <Grid.Col>
                  <Title order={3}>Results...</Title>
                </Grid.Col>
                <Grid.Col>
                  <Text c="dimmed" size="sm">
                    Found {searchResults.length} result
                    {searchResults.length === 1 ? "" : "s"}...
                  </Text>
                </Grid.Col>
                <Grid.Col>
                  <Grid>
                    {searchResults?.map((s, i) => {
                      const hasExcerpts = !!citationMap[s.id.toString()];
                      const excerpts = hasExcerpts
                        ? citationMap[s.id.toString()].excerpts
                        : [];

                      return (
                        <Grid.Col span={12} key={s.id.toString()}>
                          <Card withBorder radius="lg" h="100%">
                            <Link
                              key={s.id.toString()}
                              to={`/${s.value.type}/${s.value.id.toString()}`}
                              style={{
                                textDecoration: "none",
                                margin: 0,
                              }}
                              className="searchResult"
                              tabIndex={i}
                            >
                              <UnstyledButton key={s.id.toString()}>
                                <Group gap="xs">
                                  <Text fw="bold" c="gray">
                                    {getNodeTitle(s.value)}
                                  </Text>
                                </Group>
                                {hasExcerpts ? (
                                  <Stack gap="xs">
                                    {excerpts.map((e) => {
                                      return <Text c="dark.2">{e}</Text>;
                                    })}
                                  </Stack>
                                ) : (
                                  <Text c="dark.2">
                                    {getSearchResultPreview(s)}
                                  </Text>
                                )}
                              </UnstyledButton>
                            </Link>
                          </Card>
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
  return (
    <div>
      <Text>
        {overview.findings.map((finding) => {
          console.log("Finding: ", finding);
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
                  <ActionIcon variant="subtle">({citationNumber})</ActionIcon>
                </HoverCard.Target>
                <HoverCard.Dropdown>
                  <Stack>
                    <Link
                      to={`/idea/${mappedValue.id.toString()}`}
                      style={{ textDecoration: "none" }}
                    >
                      <Group>
                        <Text fw="bold" c="gray" size="xs">
                          {title}
                        </Text>
                        <ArrowRight size={14} color="gray" weight="bold" />
                      </Group>
                    </Link>
                    <Text size="xs">...{finding.excerpt}...</Text>
                  </Stack>
                </HoverCard.Dropdown>
              </HoverCard>
              {finding.analysis}
            </Text>
          );
        })}
      </Text>
      <Text mt="lg">{overview.overview}</Text>
    </div>
  );
}
