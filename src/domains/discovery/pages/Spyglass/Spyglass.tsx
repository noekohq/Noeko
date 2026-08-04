import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  HoverCard,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import GlimpseModeDisplay from "@domains/discovery/components/Spyglass/GlimpseModeDisplay";
import styles from "./Spyglass.module.scss";
import { useInteraction } from "@/contexts/InteractionContext";
import useRabbithole from "@domains/rabbitholes/hooks/useRabbithole";
import { useEffect, useState } from "react";
import { useSpyglassService } from "@domains/discovery/hooks/useSpyglassService";
import { Link, useNavigate, useSearchParams } from "react-router";
import PageWrapper from "@core/design/layout/PageWrapper";
import TopBar from "@core/design/components/Layout/TopBar";
import LeftSidebar from "@core/design/components/Layout/Left";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CaretDownIcon,
  CaretUpIcon,
  ClockCounterClockwiseIcon,
  MegaphoneIcon,
  XIcon,
} from "@phosphor-icons/react";
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
import { api } from "@infrastructure/api/client";
import { formatDateTime } from "@core/utils/formatting";
import type { ISpyglassLightHistoryResponse } from "../../../../../app/database/models/spyglass_record";

type SpyglassActivity = ISpyglassLightHistoryResponse["history"][number];

const activityStatusColor = (activity: SpyglassActivity) => {
  if (!activity.status || activity.status === "completed") return "green";
  if (activity.status === "failed") return "red";
  if (activity.status === "cancelled") return "gray";
  return "yellow";
};

const activityStatusLabel = (activity: SpyglassActivity) => {
  if (!activity.status || activity.status === "completed") return "Complete";
  if (activity.status === "queued") return "Queued";
  if (activity.status === "running") return "Running";
  if (activity.status === "cancelled") return "Cancelled";
  return "Failed";
};

export default function Spyglass() {
  const {
    actions: {
      feedback: { openFeedbackModal },
    },
  } = useInteraction();
  const { isDownRabbithole, currentRabbithole } = useRabbithole();

  const {
    global: {
      scope: { get: scope, set: setScope, has: hasScope },
    },
  } = useSearch();

  const [query, setQuery] = useState("");
  const [deepAnalysis, setDeepAnalysis] = useState(false);

  const [currentQuery, setCurrentQuery] = useState("");
  const [recentActivity, setRecentActivity] = useState<SpyglassActivity[]>([]);
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const {
    search,
    resume,
    cancel,
    runId,
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
  } = useSpyglassService({
    onRunCreated: (createdRunId) => {
      setSearchParams({ run: createdRunId });
    },
    onRunLoaded: (run) => {
      setCurrentQuery(run.query);
      setDeepAnalysis(true);
    },
  });

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

  useEffect(() => {
    const durableRunId = searchParams.get("run");
    if (durableRunId && durableRunId !== runId) {
      void resume(durableRunId);
      return;
    }
    if (searchParams.get("q")) {
      const q = searchParams.get("q") || "";
      const deep = searchParams.get("deep") === "true";
      setQuery(q);
      setDeepAnalysis(deep);
    }
  }, [resume, runId, searchParams]);

  useEffect(() => {
    if (initialized) return;
    let mounted = true;

    const loadActivity = async () => {
      try {
        const response = await api.get<{
          data: ISpyglassLightHistoryResponse;
        }>("/search/spyglass/history/light?page=1&pageSize=50");
        const activity = [...response.data.data.history].sort((a, b) => {
          const aActive = a.status === "queued" || a.status === "running";
          const bActive = b.status === "queued" || b.status === "running";
          if (aActive !== bActive) return aActive ? -1 : 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        if (mounted) setRecentActivity(activity);
      } catch (loadError) {
        console.error("Failed to load Spyglass activity:", loadError);
      }
    };

    void loadActivity();
    const refresh = window.setInterval(() => void loadActivity(), 2_000);
    return () => {
      mounted = false;
      window.clearInterval(refresh);
    };
  }, [initialized]);

  const showLoadingState = initialized && loading && !overview && !glimpseResult;

  // Show analysis state for Deep Focus when we have sources but are still analyzing
  const showDeepFocusAnalysis =
    initialized && loading && deepAnalysis && results.length > 0 && !overview;

  const startNewQuery = () => {
    reset();
    uninitialize();
    setQuery("");
    setCurrentQuery("");
    setSearchParams({});
  };

  const openActivity = (activity: SpyglassActivity) => {
    const id = activity.id.toString();
    if (id.startsWith("spyglass_run:")) {
      setSearchParams({ run: id });
    } else {
      navigate(`/spyglass/records/${id}`);
    }
  };

  const cancelActivity = async (activity: SpyglassActivity) => {
    const id = activity.id.toString();
    if (!id.startsWith("spyglass_run:")) return;
    await api.post(`/search/spyglass/runs/${encodeURIComponent(id)}/cancel`);
    setRecentActivity((current) =>
      current.map((item) => (item.id.toString() === id ? { ...item, status: "cancelled" } : item))
    );
  };

  const visibleActivity = recentActivity.slice(0, activityExpanded ? 10 : 5);

  return (
    <PageWrapper>
      <TopBar />
      <LeftSidebar
        topLevel={{
          open: (
            <>
              <Link to="/spyglass/history">
                <ActionIcon
                  aria-label="View Spyglass history"
                  color="gray"
                  radius="lg"
                  variant="light"
                >
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
              <ActionIcon aria-label="View Spyglass history" color="gray" variant="light" size="sm">
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
                      Spyglass is currently under active development and some features might not
                      always work as expected. We're looking for feedback as we learn and grow :)
                    </Text>
                    <Text size="xs" c="dimmed">
                      This feature will remain free during its beta stage. Rate limits may apply in
                      future versions.
                    </Text>
                    <ActionIcon
                      aria-label="Send Spyglass feedback"
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

          {!loading && (
            <div className={styles.userInput}>
              <div
                className={`${styles.textboxContainer} ${initialized ? styles.initialized : ""}`}
              >
                <Textbox
                  value={query}
                  onSubmit={handleSubmit}
                  onReset={startNewQuery}
                  onChange={setQuery}
                  placeholder={
                    initialized ? "Ask a follow-up question..." : "Ask your thoughts anything..."
                  }
                  initialized={initialized}
                  deepAnalysis={deepAnalysis}
                  setDeepAnalysis={setDeepAnalysis}
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

          <div className={`${styles.scrollableContent} ${initialized ? styles.initialized : ""}`}>
            {!initialized && recentActivity.length > 0 && (
              <Stack className={styles.activityShelf} gap={0} mt="lg">
                <Group className={styles.activityHeader} justify="space-between">
                  <Text c="dimmed" fw={600} size="xs">
                    Recent
                  </Text>
                  <Group gap="xs">
                    {activityExpanded && (
                      <Button
                        color="gray"
                        leftSection={<CaretUpIcon />}
                        onClick={() => setActivityExpanded(false)}
                        size="compact-xs"
                        variant="subtle"
                      >
                        Show less
                      </Button>
                    )}
                    <Link to="/spyglass/history">
                      <Button variant="subtle" color="gray" size="compact-xs">
                        View all
                      </Button>
                    </Link>
                  </Group>
                </Group>

                {visibleActivity.map((activity) => {
                  const active = activity.status === "queued" || activity.status === "running";
                  return (
                    <Group
                      className={styles.activityRow}
                      justify="space-between"
                      key={activity.id.toString()}
                      wrap="nowrap"
                    >
                      <Group className={styles.activitySummary} gap="xs" wrap="nowrap">
                        <Text className={styles.activityQuery} fw={500} size="sm" lineClamp={1}>
                          {activity.baseQuery}
                        </Text>
                        <Badge
                          color={activityStatusColor(activity)}
                          size="xs"
                          variant={active ? "dot" : "light"}
                        >
                          {activityStatusLabel(activity)}
                        </Badge>
                        <Text className={styles.activityMeta} c="dimmed" size="xs">
                          {activity.isDeepAnalysis ? "Deep Focus" : "Glimpse"}
                        </Text>
                        <Text className={styles.activityTime} c="dimmed" size="xs">
                          {formatDateTime(activity.createdAt)}
                        </Text>
                      </Group>
                      <Group gap={2} wrap="nowrap">
                        {active && (
                          <Tooltip label="Cancel run">
                            <ActionIcon
                              aria-label={`Cancel run: ${activity.baseQuery}`}
                              color="red"
                              onClick={() => void cancelActivity(activity)}
                              size="sm"
                              variant="subtle"
                            >
                              <XIcon />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        <Tooltip label={active ? "Resume run" : "Open result"}>
                          <ActionIcon
                            aria-label={`${active ? "Resume" : "Open"} run: ${activity.baseQuery}`}
                            color="gray"
                            onClick={() => openActivity(activity)}
                            size="sm"
                            variant="subtle"
                          >
                            <ArrowRightIcon />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Group>
                  );
                })}

                {recentActivity.length > 5 && !activityExpanded && (
                  <Button
                    className={styles.activityExpand}
                    color="gray"
                    leftSection={<CaretDownIcon />}
                    onClick={() => setActivityExpanded(true)}
                    size="compact-xs"
                    variant="subtle"
                  >
                    {`Show ${Math.min(5, recentActivity.length - 5)} more`}
                  </Button>
                )}
              </Stack>
            )}

            {initialized && (
              <Button
                className={styles.newQueryButton}
                color="gray"
                leftSection={<ArrowLeftIcon />}
                onClick={startNewQuery}
                size="compact-sm"
                variant="subtle"
              >
                New query
              </Button>
            )}

            {error && !loading && (
              <Alert color="red" title="Could not complete this analysis" mb="md">
                {error} You can edit your question and try again.
              </Alert>
            )}

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

            {loading && deepAnalysis && runId && (
              <Group justify="center" mt="md">
                <Button color="red" variant="subtle" size="xs" onClick={() => void cancel()}>
                  Cancel Deep Focus
                </Button>
              </Group>
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
