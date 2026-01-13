import {
  ActionIcon,
  Badge,
  Button,
  Group,
  HoverCard,
  Loader,
  Space,
  Stack,
  Text,
  Title,
  Collapse,
  Tooltip,
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
  FunnelIcon,
  MegaphoneIcon,
  XIcon,
} from "@phosphor-icons/react";
import SpyglassContext from "./Spyglass/SpyglassContext";
import ScopeBuilder from "../../components/Search/ScopeBuilder/ScopeBuilder";
import Content from "../../components/UI/Layout/Content";
import Textbox from "./Textbox";
import CountUp from "../../components/Utils/Animations/Countup";
import { DisplayOverview } from "../../components/Utils/Spyglass/Overview";
import Nav from "../../components/UI/Layout/Nav";
import RightSidebar from "../../components/UI/Layout/Right";
import SpyglassActions from "./Spyglass/SpyglassActions";
import { useSearch } from "../../contexts/SearchContext";

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

  const { isDownRabbithole, currentRabbithole, exitRabbithole } =
    useRabbithole();

  const {
    global: {
      scope: { get: scope, set: setScope },
      showScope: { get: showScope, set: setShowScope },
    },
  } = useSearch();

  // SPYGLASS PARAMS
  const [query, setQuery] = useState("");
  const [deepAnalysis, setDeepAnalysis] = useState(false);

  const [currentQuery, setCurrentQuery] = useState("");

  const {
    search,
    reset,
    save,
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

  const [searchParams, setParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("q")) {
      const q = searchParams.get("q") || "";
      const deepAnalysis = searchParams.get("deep") === "true";
      setQuery(q);
      setDeepAnalysis(deepAnalysis);
    }
  }, [searchParams]);

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
          <SpyglassContext
            citationMap={citationMap}
            results={fullResults || []}
          />
        </LeftSidebar.Open>
        <LeftSidebar.Collapsed>
          <Stack>
            {findings.length > 0 && (
              <ActionIcon
                variant="light"
                size="sm"
                radius="md"
                color="gray"
                onClick={() => {
                  setLeftSidebar("open");
                }}
              >
                <Text size="xs">{findings.length}</Text>
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
          {!loading && (
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
              />
            </div>
          )}
          {!initialized && (
            <div className={styles.scopeWrapper}>
              <Group justify="center" mb="xs">
                <Tooltip label="Adjust Scope" position="top" withArrow>
                  <ActionIcon 
                    variant={showScope ? "filled" : "light"} 
                    size="md" 
                    onClick={() => setShowScope(!showScope)}
                    color="gray"
                    radius="xl"
                  >
                    <FunnelIcon size={18} />
                  </ActionIcon>
                </Tooltip>
              </Group>
              <Collapse in={showScope}>
                <ScopeBuilder
                  value={scope}
                  onChange={setScope}
                />
              </Collapse>
            </div>
          )}
          <div
            className={`${styles.scrollableContent} ${initialized ? styles.initialized : ""}`}
          >
            {initialized && (
              <Text className={styles.queryHeader} mb="lg" size="lg" fw="565">
                <Group wrap="nowrap" gap="xs" component="span">
                  {currentQuery}
                  {loading && <Loader size="14px" color="gray" />}
                </Group>
              </Text>
            )}
            {initialized && (
              <div
                className={`${styles.preview} ${overview.length ? styles.hide : ""}`}
              >
                {results.length <= 0 && (
                  <Text mb="lg" size="sm">
                    {!!intent && intent.searches?.length > 0 ? (
                      <span>
                        Running{" "}
                        <Badge variant="light" color="gray">
                          <CountUp targetNumber={intent.searches.length} />
                        </Badge>{" "}
                        search{intent.searches.length === 1 ? "" : "es"}...
                      </span>
                    ) : isDownRabbithole ? (
                      "Accessing your Rabbithole..."
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
                  const result = resultsMap[sourceId];
                  if (!result) {
                    return null;
                  }
                  const title = result.name;

                  return (
                    <Group
                      gap="xs"
                      className={styles.previewItem}
                      key={sourceId.toString()}
                    >
                      <Text size="sm" c="dimmed">
                        Read
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
                        {title ? title : "Unknown source"}
                      </Badge>
                    </Group>
                  );
                })}
                {deepAnalysis && results.length > 0 && (
                  <>
                    <Text className={styles.previewItem} mt="lg" size="sm">
                      <Group component="span" align="center" gap="xs">
                        Analyzing results...
                      </Group>
                    </Text>
                    <Text size="sm" className={styles.previewItem}>
                      {findings.length} finding
                      {findings.length === 1 ? "" : "s"}...
                    </Text>
                  </>
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
            {!deepAnalysis && glimpseResult && (
              <div className={styles.overviewDisplay}>
                <GlimpseModeDisplay
                  glimpseResult={glimpseResult}
                  resultsMap={resultsMap ?? {}}
                />
              </div>
            )}
          </div>
        </div>
      </Content>
      <Nav />
      <RightSidebar>
        <RightSidebar.Open>
          {/*<Search />*/}
          <SpyglassActions intent={intent} results={fullResults} />
        </RightSidebar.Open>
      </RightSidebar>
    </PageWrapper>
  );
}
