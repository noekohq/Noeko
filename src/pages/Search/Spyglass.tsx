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
} from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/LeftSidebar";
import RightSidebar from "../../components/UI/RightSidebar";
import { SearchBar } from "../../components/Search/SearchBar";
import { Link } from "react-router";
import { getNodeTitle } from "../../utils/graph";
import { Star } from "@phosphor-icons/react";
import Match from "../../components/Utils/Match";
import { useCallback, useRef, useState } from "react";
import { useSearch } from "../../contexts/SearchContext";
import styles from "./Spyglass.module.scss";
import { getSearchResultPreview } from "../../utils/search";
import { ISearchOverview } from "../../../app/services/Search";

import parse, {
  domToReact,
  HTMLReactParserOptions,
  Element,
} from "html-react-parser";
import { Citation } from "./Citation"; // Adjust path to your Citation component

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

  // No need for processCitations or parseOverviewHtml separately with this approach

  const citationMap = useRef(
    new Map<
      string,
      {
        snippet: string;
      }
    >(),
  );

  const parserOptions: HTMLReactParserOptions = {
    replace: (domNode) => {
      // Check if it's an element node (type: 'tag' for html-react-parser)
      if (domNode instanceof Element && domNode.attribs) {
        // Check if it's our citation span
        if (domNode.name === "span" && domNode.attribs["data-citation-id"]) {
          const id = domNode.attribs["data-citation-id"];
          // html-react-parser provides children, so we can get the snippet text
          console.log("Domnode: ", domNode);
          const snippet =
            domNode.children &&
            domNode.children[0] &&
            "data" in domNode.children[0]
              ? domNode.children[0].data
              : "No preview available."; // Fallback snippet text

          return (
            <Citation
              id={id}
              snippet={snippet}
              // You might want to pass a key if these are in a list,
              // but html-react-parser handles keys for replaced elements.
            />
          );
        }
      }
      // For all other nodes, let html-react-parser handle them by default
      // (or return undefined, which means it will process as usual)
      return undefined;
    },
  };

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
          {loadingSearch && (
            <Group>
              <Loader size="sm" c="dimmed" />
              <Text c="dimmed" size="sm">
                Searching your ideas...
              </Text>
            </Group>
          )}
          {searchResults && (
            <>
              <Grid>
                <Grid.Col>
                  {overview &&
                    overview.overview && ( // Ensure overview and overview.overview exist
                      <Card withBorder radius="lg">
                        <Title order={3}>Overview</Title>
                        <Divider my="xs" />
                        {/* <div
                          className={styles.overviewDisplay}
                          dangerouslySetInnerHTML={{
                            __html: overview.overview,
                          }}
                        /> */}
                        <div className={styles.overviewDisplay}>
                          {parse(overview.overview, parserOptions)}
                        </div>
                      </Card>
                    )}
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
                      const isBest = i === 0;
                      return (
                        <Grid.Col
                          span={{ xs: 12, sm: 6, md: 4 }}
                          key={s.id.toString()}
                        >
                          <Card withBorder radius="lg" h="100%">
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
                                <Group gap="xs">
                                  {isBest && (
                                    <Star color="white" weight="fill" />
                                  )}
                                  <Text fw="bold" c="gray">
                                    {getNodeTitle(s.value)}
                                  </Text>
                                </Group>
                                <Text c="dimmed">
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
                                </Text>
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
