import { ActionIcon, Badge, Group, HoverCard, Loader, Stack, Text, Title } from "@mantine/core";
import GlimpseModeDisplay from "@domains/discovery/components/Spyglass/GlimpseModeDisplay";
import styles from "./Spyglass.module.scss";
import { useInteraction } from "@/contexts/InteractionContext";
import { useLayout } from "@/contexts/LayoutContext";
import useRabbithole from "@domains/rabbitholes/hooks/useRabbithole";
import { useEffect, useState } from "react";
import { useSpyglassService } from "@domains/discovery/hooks/useSpyglassService";
import { Link, useSearchParams } from "react-router";
import PageWrapper from "@core/design/layout/PageWrapper";
import TopBar from "@core/design/components/Layout/TopBar";
import LeftSidebar from "@core/design/components/Layout/Left";
import { ClockCounterClockwiseIcon, MegaphoneIcon } from "@phosphor-icons/react";
import SpyglassContext from "./Spyglass/SpyglassContext";
import Content from "@core/design/components/Layout/Content";
import Textbox from "./Textbox";
import CountUp from "@core/design/components/Animations/Countup";
import { DisplayOverview } from "@domains/discovery/components/Spyglass/Overview";
import Nav from "@core/design/components/Layout/Nav";
import LangtonsAntLoader from "@core/design/components/Loading/AntLoader";
import RightSidebar from "@core/design/components/Layout/Right";
import SpyglassActions from "./Spyglass/SpyglassActions";
import { useSearch } from "@domains/discovery/contexts/SearchContext";
import GlimpseNavigation from "@domains/discovery/components/Spyglass/GlimpseNavigation";
import DeepFocusNavigation from "@domains/discovery/components/Spyglass/DeepFocusNavigation";
import ScopeDisplay from "@domains/discovery/components/Search/ScopeBuilder/ScopeDisplay";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/core/macro";
import { Trans, Plural } from "@lingui/react/macro";

export default function Spyglass() {
  const { i18n } = useLingui();
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
      true
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

  const showLoadingState = initialized && loading && !overview && !glimpseResult;

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
          {!deepAnalysis && glimpseResult && glimpseResult.contentMap.length > 0 ? (
            <GlimpseNavigation glimpseResult={glimpseResult} resultsMap={resultsMap ?? {}} />
          ) : deepAnalysis && overview ? (
            <DeepFocusNavigation
              overview={overview}
              findings={findings}
              resultsMap={resultsMap ?? {}}
            />
          ) : (
            <Stack gap="xs">
              <Text fw="bold" c="dimmed" size="sm">
                <Trans>No results yet</Trans>
              </Text>
              <Text size="xs" c="dimmed">
                <Trans>Ask something to see the outline here</Trans>
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
        <div className={`${styles.spyglass} ${initialized ? styles.initialized : ""}`}>
          {!initialized && (
            <Group gap="xs" justify="center">
              <Title ta={"center"} className={`${styles.header}`} mb="lg">
                <Trans>Spyglass</Trans>
              </Title>
              <HoverCard openDelay={400} width="300px">
                <HoverCard.Target>
                  <Badge color="gray" size="sm" variant="light">
                    <Trans>BETA</Trans>
                  </Badge>
                </HoverCard.Target>
                <HoverCard.Dropdown>
                  <Stack gap="xs">
                    <Text size="sm">
                      <Trans>
                        Spyglass is currently under active development and some features might not
                        always work as expected. We're looking for feedback as we learn and grow :)
                      </Trans>
                    </Text>
                    <Text size="xs" c="dimmed">
                      <Trans>
                        This feature will remain free during it's beta stage. Rate limits may apply
                        in future versions.
                      </Trans>
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

          <div className={`${styles.scrollableContent} ${initialized ? styles.initialized : ""}`}>
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
                            <Plural
                              value={intent.searches.length}
                              one={
                                <Trans>
                                  Running{" "}
                                  <Badge variant="light" color="gray" size="sm">
                                    <CountUp targetNumber={intent.searches.length} />
                                  </Badge>{" "}
                                  search
                                </Trans>
                              }
                              other={
                                <Trans>
                                  Running{" "}
                                  <Badge variant="light" color="gray" size="sm">
                                    <CountUp targetNumber={intent.searches.length} />
                                  </Badge>{" "}
                                  searches
                                </Trans>
                              }
                            />
                          </span>
                        ) : isDownRabbithole ? (
                          <Trans>Accessing your Rabbithole</Trans>
                        ) : (
                          <Trans>Searching your ideas</Trans>
                        )}
                      </>
                    ) : (
                      <span>
                        <Plural
                          value={results.length}
                          one={
                            <Trans>
                              Reading{" "}
                              <Badge variant="light" color="gray" size="sm">
                                <CountUp targetNumber={results.length} />
                              </Badge>{" "}
                              source
                            </Trans>
                          }
                          other={
                            <Trans>
                              Reading{" "}
                              <Badge variant="light" color="gray" size="sm">
                                <CountUp targetNumber={results.length} />
                              </Badge>{" "}
                              sources
                            </Trans>
                          }
                        />
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
                  <LangtonsAntLoader stepsPerSecond={15} cellSize={20} numAnts={6} />
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
                      {result.name || i18n._(t`Unknown source`)}
                    </Badge>
                  ))}
                </div>
                {findings.length > 0 && (
                  <Text size="xs" c="dimmed" mt="md">
                    <Plural
                      value={findings.length}
                      one="Found # finding..."
                      other="Found # findings..."
                    />
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
              (glimpseResult.summary || (glimpseResult.contentMap?.length ?? 0) > 0) && (
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
                      ? i18n._(t`Ask a follow-up question...`)
                      : i18n._(t`Ask your thoughts anything...`)
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
                    <Trans>FILTERS</Trans>
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
