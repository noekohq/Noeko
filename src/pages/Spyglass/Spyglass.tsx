import {
  Title,
  Text,
  Group,
  Stack,
  ActionIcon,
  Button,
  Badge,
  HoverCard,
  Transition,
} from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import { Link, useSearchParams } from "react-router";
import { getNodeTitle } from "../../utils/graph";
import { useEffect, useRef, useState } from "react";
import styles from "./Spyglass.module.scss";
import useSpyglass from "./hooks/useSpyglass";
import Textbox from "./Textbox";
import { useLayout } from "../../contexts/LayoutContext";
import CountUp from "../../components/Utils/Animations/Countup";
import { DisplayOverview } from "../../components/Utils/Spyglass/Overview";
import {
  ArrowsClockwiseIcon,
  ClockCounterClockwiseIcon,
  InfoIcon,
  MegaphoneIcon,
} from "@phosphor-icons/react";
import Content from "../../components/UI/Layout/Content";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import useRabbithole from "../../hooks/useRabbithole";
import { useInteraction } from "../../contexts/InteractionContext";
import SpyglassContext from "./Spyglass/SpyglassContext";
import SpyglassActions from "./Spyglass/SpyglassActions";

export default function Spyglass() {
  const { isDownRabbithole, currentRabbithole } = useRabbithole();

  const [query, setQuery] = useState<string>("");
  const [parentId, setParentId] = useState<string | null>(null);
  const {
    spyglassId,
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
    error,
  } = useSpyglass({ query, parentId });

  const hasInitialized = useRef(false);
  useEffect(() => {
    if (spyglassInitialized && !hasInitialized.current) {
      hasInitialized.current = true;
    }
  }, [spyglassInitialized]);

  const initialized = hasInitialized.current;

  useEffect(() => {
    if (complete && spyglassId) {
      setQuery("");
      setParentId(spyglassId);
    }
  }, [complete, spyglassId]);

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
    }
  }, [searchParams]);

  const displayQuery = useRef<string>(null);

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

  useDocumentTitle(queryToShow() ? `${queryToShow()} - Noeko` : `Noeko`);

  const {
    elements: {
      leftSidebar: {
        mode: { set: setLeftSidebar },
      },
    },
  } = useLayout();

  const {
    actions: {
      feedback: { openFeedbackModal },
    },
  } = useInteraction();

  if (error) {
    return (
      <PageWrapper>
        <LeftSidebar startClosed></LeftSidebar>
        <Content>
          <div className={styles.spyglass}>
            <Stack>
              <Title>Something went wrong :/</Title>
              <Text size="sm" c="dimmed">
                {error}
              </Text>
              <Group>
                <Button
                  size="sm"
                  variant="light"
                  onClick={() => clear(true)}
                  rightSection={<ArrowsClockwiseIcon weight="bold" />}
                >
                  Start Over
                </Button>
                <Button
                  size="sm"
                  variant="light"
                  rightSection={<MegaphoneIcon weight="bold" />}
                  color="gray"
                >
                  Leave Feedback
                </Button>
              </Group>
            </Stack>
          </div>
        </Content>
        <RightSidebar startClosed></RightSidebar>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <LeftSidebar
        topLevel={{
          open: (
            <>
              <Link to="/spyglass/history">
                <ActionIcon color="gray" radius="lg" variant="light">
                  <ClockCounterClockwiseIcon />
                </ActionIcon>
              </Link>
            </>
          ),
        }}
      >
        <LeftSidebar.Open>
          <SpyglassContext citationMap={citationMap} results={results} />
        </LeftSidebar.Open>
        <LeftSidebar.Collapsed>
          <Stack>
            {overview.findings.length > 0 && (
              <ActionIcon
                variant="light"
                size="sm"
                radius="md"
                color="gray"
                onClick={() => {
                  setLeftSidebar("open");
                }}
              >
                <Text size="xs">{overview.findings.length}</Text>
              </ActionIcon>
            )}
            <Link to="/spyglass/history">
              <ActionIcon color="gray" variant="light" size="sm">
                <ClockCounterClockwiseIcon />
              </ActionIcon>
            </Link>
          </Stack>
        </LeftSidebar.Collapsed>
      </LeftSidebar>
      <Content>
        <div className={styles.spyglass}>
          <div
            className={`${styles.scrollableContent} ${initialized ? styles.initialized : ""}`}
          >
            {!initialized && (
              <Group gap="xs" justify="center">
                <Title
                  ta={initialized ? "left" : "center"}
                  className={`${styles.header} ${initialized ? styles.initialized : ""}`}
                  order={initialized ? 2 : 1}
                  mb="lg"
                >
                  Spyglass
                </Title>
                <HoverCard openDelay={400} width="300px">
                  <HoverCard.Target>
                    <Badge color="gray" size="sm" variant="light">
                      BETA
                    </Badge>
                  </HoverCard.Target>
                  <HoverCard.Dropdown>
                    <Stack gap="xs">
                      <Text size="sm">
                        Spyglass is currently under active development and some
                        features might not always work as expected. We're
                        looking for feedback as we learn and grow :)
                      </Text>
                      <Text size="xs" c="dimmed">
                        This feature will remain free during it's beta stage.
                        Rate limits may apply in future versions.
                      </Text>
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="blue"
                        onClick={() => {
                          openFeedbackModal();
                        }}
                      >
                        <MegaphoneIcon size="12" weight="bold" />
                      </ActionIcon>
                    </Stack>
                  </HoverCard.Dropdown>
                </HoverCard>
              </Group>
            )}
            {(!!initialized || !!initializing) && (
              <Text
                className={styles.queryHeader}
                size="lg"
                mb="lg"
                fs="italic"
              >
                {queryToShow()}
              </Text>
            )}
            {initialized && (
              <div
                className={`${styles.preview} ${!!overview.overview.length ? styles.hide : ""}`}
              >
                {results.length <= 0 && (
                  <Text mb="lg" size="sm">
                    {!!intent && intent.queries?.length > 0 ? (
                      <span>
                        Running{" "}
                        <Badge variant="light" color="gray">
                          <CountUp targetNumber={intent.queries.length} />
                        </Badge>{" "}
                        search{intent.queries.length === 1 ? "" : "es"}...
                      </span>
                    ) : (
                      "Searching your ideas..."
                    )}
                  </Text>
                )}
                {results.length > 0 && (
                  <Text mb="lg" size="sm">
                    Reading{" "}
                    <Badge variant="light" color="gray" component="span">
                      {<CountUp targetNumber={results.length} />}
                    </Badge>{" "}
                    resource{results.length === 1 ? "" : "s"}...
                  </Text>
                )}
                {Object.entries(citationMap).map(([sourceId, citation]) => {
                  const { excerpts, index } = citation;
                  const result = resultMap[sourceId];
                  return (
                    <Transition
                      mounted={true}
                      transition="skew-down"
                      key={sourceId}
                    >
                      {(style) => {
                        return (
                          <Group
                            gap="xs"
                            className={styles.previewItem}
                            style={style}
                          >
                            <Text size="sm" c="dimmed">
                              Reading
                            </Text>
                            <Badge
                              variant="light"
                              color="gray"
                              styles={{
                                label: {
                                  textTransform: "none",
                                },
                              }}
                            >
                              {result ? getNodeTitle(result) : "Unknown source"}
                            </Badge>
                          </Group>
                        );
                      }}
                    </Transition>
                  );
                })}
                {overview.findings.length > 0 && (
                  <>
                    <Text className={styles.previewItem} mt="lg" size="sm">
                      Analyzing results...
                    </Text>
                    <Text size="sm" className={styles.previewItem}>
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
                  value={query}
                  onSubmit={() => {
                    clear();
                    initialize();
                  }}
                  onChange={(v) => {
                    setQuery(v);
                  }}
                  placeholder="Ask your thoughts anything..."
                  placeholderIfInitialized="Ask a follow-up question..."
                  initialized={initialized}
                />
                {initialized && (
                  <ActionIcon
                    onClick={() => {
                      hasInitialized.current = false;
                      clear(true);
                      setParentId(null);
                    }}
                    color="gray"
                    size="md"
                    variant="light"
                    radius="lg"
                  >
                    <ArrowsClockwiseIcon />
                  </ActionIcon>
                )}
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
                  <HoverCard width="300px" openDelay={200}>
                    <HoverCard.Target>
                      <ActionIcon variant="subtle" color="gray" size="sm">
                        <InfoIcon />
                      </ActionIcon>
                    </HoverCard.Target>
                    <HoverCard.Dropdown>
                      <Text size="sm">
                        Ask your thoughts anything with Spyglass. Given a
                        prompt, Spyglass will search and analyze your notes for
                        relevant excerpts, then generate a response based on
                        those findings, with citations.
                      </Text>
                      {isDownRabbithole && (
                        <Text size="xs" c="dimmed" mt="md">
                          Since you have entered a Rabbithole, Spyglass will
                          only search within "{currentRabbithole?.name}".
                        </Text>
                      )}
                      {!isDownRabbithole && (
                        <Text size="xs" c="dimmed" mt="md">
                          Tip: If you enter a Rabbithole, Spyglass will only
                          search within that Rabbithole.
                        </Text>
                      )}
                    </HoverCard.Dropdown>
                  </HoverCard>
                </Group>
              )}
            </>
          )}
        </div>
      </Content>
      <RightSidebar>
        <RightSidebar.Open>
          <SpyglassActions intent={intent} results={results} />
        </RightSidebar.Open>
      </RightSidebar>
    </PageWrapper>
  );
}
