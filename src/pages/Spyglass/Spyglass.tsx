import {
  ActionIcon,
  Badge,
  Group,
  HoverCard,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import GlimpseModeDisplay from "../../components/Utils/Spyglass/GlimpseModeDisplay";
import styles from "./Spyglass.module.scss";
import { useInteraction } from "../../contexts/InteractionContext";
import { useLayout } from "../../contexts/LayoutContext";
import useRabbithole from "../../hooks/useRabbithole";
import { useEffect, useState } from "react";
import { useSpyglassService } from "../../hooks/useSpyglassService";
import { Link, useSearchParams } from "react-router";
import PageWrapper from "../../components/Layout/PageWrapper";
import TopBar from "../../components/UI/Layout/TopBar";
import LeftSidebar from "../../components/UI/Layout/Left";
import {
  ClockCounterClockwiseIcon,
  MegaphoneIcon,
} from "@phosphor-icons/react";
import SpyglassContext from "./Spyglass/SpyglassContext";
import Content from "../../components/UI/Layout/Content";
import Textbox from "./Textbox";
import CountUp from "../../components/Utils/Animations/Countup";
import { DisplayOverview } from "../../components/Utils/Spyglass/Overview";
import Nav from "../../components/UI/Layout/Nav";
import LangtonsAntLoader from "../../components/Utils/Loading/AntLoader";
import RightSidebar from "../../components/UI/Layout/Right";
import SpyglassActions from "./Spyglass/SpyglassActions";
import { useSearch } from "../../contexts/SearchContext";
import GlimpseNavigation from "../../components/Utils/Spyglass/GlimpseNavigation";
import DeepFocusNavigation from "../../components/Utils/Spyglass/DeepFocusNavigation";
import ScopeDisplay from "../../components/Search/ScopeBuilder/ScopeDisplay";

export default function Spyglass() {
  const {
    actions: {
      feedback: { openFeedbackModal },
    },
  } = useInteraction();
  const {
    elements: {
      leftSidebar: {
        mode: { set: setLeftSidebar },
      },
    },
  } = useLayout();

  const { isDownRabbithole, currentRabbithole } = useRabbithole();

  const {
    global: {
      scope: { get: scope, set: setScope, has: hasScope },
    },
  } = useSearch();

  const [query, setQuery] = useState("");
  const [deepAnalysis, setDeepAnalysis] = useState(false);

  const [currentQuery, setCurrentQuery] = useState("");

  const {
    search,
    reset,
    error,
    initialized,
    loading,
    complete,
    intent,
    results,
    fullResults,
    findings,
    overview,
    glimpseResult,
    citationMap,
    resultsMap,
    status,
    uninitialize,
  } = useSpyglassService();

  const handleSubmit = () => {
    if (!query) return;
    setCurrentQuery(query);
    search(
      {
        query,
        deepAnalysis,
        rabbithole: currentRabbithole
          ? currentRabbithole.id.toString()
          : scope.rabbithole || undefined,
        tags: scope.tags,
        date: scope.date,
      },
      true,
    );
  };

  useEffect(() => {
    if (complete) {
      setQuery("");
    }
  }, [complete]);

  const [searchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("q")) {
      const q = searchParams.get("q") || "";
      const deep = searchParams.get("deep") === "true";
      setQuery(q);
      setDeepAnalysis(deep);
    }
  }, [searchParams]);

  const showLoadingState =
    initialized && loading && !overview && !glimpseResult;

  // Show analysis state for Deep Focus when we have sources but are still analyzing
  const showDeepFocusAnalysis =
    initialized && loading && deepAnalysis && results.length > 0 && !overview;

  return (
    <PageWrapper>
      <TopBar />
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
          {!deepAnalysis &&
          glimpseResult &&
          glimpseResult.contentMap.length > 0 ? (
            <GlimpseNavigation
              glimpseResult={glimpseResult}
              resultsMap={resultsMap ?? {}}
            />
          ) : deepAnalysis && overview ? (
            <DeepFocusNavigation
              overview={overview}
              findings={findings}
              resultsMap={resultsMap ?? {}}
            />
          ) : (
            <Stack gap="xs">
              <Text fw="bold" c="dimmed" size="sm">
                No results yet
              </Text>
              <Text size="xs" c="dimmed">
                Ask something to see the outline here
              </Text>
            </Stack>
          )}
        </LeftSidebar.Open>
        <LeftSidebar.Collapsed>
          <Stack>
            <Link to="/spyglass/history">
              <ActionIcon color="gray" variant="light" size="sm">
                <ClockCounterClockwiseIcon />
              </ActionIcon>
            </Link>
          </Stack>
        </LeftSidebar.Collapsed>
      </LeftSidebar>
      <Content>
        <div
          className={`${styles.spyglass} ${initialized ? styles.initialized : ""}`}
        >
          {!initialized && (
            <Group gap="xs" justify="center">
              <Title ta={"center"} className={`${styles.header}`} mb="lg">
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
                      features might not always work as expected. We're looking
                      for feedback as we learn and grow :)
                    </Text>
                    <Text size="xs" c="dimmed">
                      This feature will remain free during it's beta stage. Rate
                      limits may apply in future versions.
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

          <div
            className={`${styles.scrollableContent} ${initialized ? styles.initialized : ""}`}
          >
            {showLoadingState && !showDeepFocusAnalysis && (
              <div className={styles.loadingState}>
                <Title order={1} className={styles.loadingQuery}>
                  {currentQuery}
                </Title>
                <div className={styles.loadingIndicator}>
                  <Text size="sm" c="dimmed" className={styles.loadingText}>
                    {results.length <= 0 ? (
                      <>
                        {!!intent && intent.searches?.length > 0 ? (
                          <span>
                            Running{" "}
                            <Badge variant="light" color="gray" size="sm">
                              <CountUp targetNumber={intent.searches.length} />
                            </Badge>{" "}
                            search{intent.searches.length === 1 ? "" : "es"}
                          </span>
                        ) : isDownRabbithole ? (
                          "Accessing your Rabbithole"
                        ) : (
                          "Searching your ideas"
                        )}
                      </>
                    ) : (
                      <span>
                        Reading{" "}
                        <Badge variant="light" color="gray" size="sm">
                          <CountUp targetNumber={results.length} />
                        </Badge>{" "}
                        source{results.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </Text>
                </div>
              </div>
            )}

            {showDeepFocusAnalysis && (
              <div className={styles.analysisState}>
                <Title order={1} className={styles.loadingQuery}>
                  {currentQuery}
                </Title>
                <div className={styles.analysisLoader}>
                  <LangtonsAntLoader
                    stepsPerSecond={15}
                    cellSize={20}
                    numAnts={6}
                  />
                </div>
                <div className={styles.loadingSources}>
                  {results.map((result) => (
                    <Badge
                      key={result.id.toString()}
                      variant="light"
                      color="gray"
                      size="sm"
                      className={styles.sourceChip}
                      styles={{
                        label: { textTransform: "none" },
                      }}
                    >
                      {result.name || "Unknown source"}
                    </Badge>
                  ))}
                </div>
                {findings.length > 0 && (
                  <Text size="xs" c="dimmed" mt="md">
                    Found {findings.length} finding
                    {findings.length === 1 ? "" : "s"}...
                  </Text>
                )}
              </div>
            )}

            {deepAnalysis && overview && (
              <div className={styles.overviewDisplay}>
                <DisplayOverview
                  overview={overview}
                  findings={findings}
                  resultsMap={resultsMap ?? {}}
                  citationMap={citationMap ?? {}}
                  query={currentQuery}
                  results={results}
                  loading={loading}
                />
              </div>
            )}

            {!deepAnalysis &&
              glimpseResult &&
              (glimpseResult.summary ||
                (glimpseResult.contentMap?.length ?? 0) > 0) && (
                <div className={styles.overviewDisplay}>
                  <GlimpseModeDisplay
                    glimpseResult={glimpseResult}
                    resultsMap={resultsMap ?? {}}
                    query={currentQuery}
                    loading={loading}
                    status={status}
                  />
                </div>
              )}
          </div>

          {!loading && (
            <div className={`${styles.userInput}`}>
              <div
                className={`${styles.textboxContainer} ${initialized ? styles.initialized : ""}`}
              >
                <Textbox
                  value={query}
                  onSubmit={() => {
                    handleSubmit();
                  }}
                  onReset={() => {
                    reset();
                    uninitialize();
                    setQuery("");
                  }}
                  onChange={(v) => {
                    setQuery(v);
                  }}
                  placeholder={
                    initialized
                      ? "Ask a follow-up question..."
                      : "Ask your thoughts anything..."
                  }
                  initialized={initialized}
                  deepAnalysis={deepAnalysis}
                  setDeepAnalysis={(v) => {
                    setDeepAnalysis(v);
                  }}
                  scope={scope}
                  onScopeChange={setScope}
                />
              </div>
              {hasScope && !initialized && (
                <div className={styles.scope}>
                  <Text fw="bold" c="dimmed" size="sm" mb="xs">
                    FILTERS
                  </Text>
                  <ScopeDisplay />
                </div>
              )}
            </div>
          )}
        </div>
      </Content>
      <Nav />
      <RightSidebar>
        <RightSidebar.Open>
          <SpyglassActions intent={intent} results={fullResults} />
        </RightSidebar.Open>
      </RightSidebar>
    </PageWrapper>
  );
}
