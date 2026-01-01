import { Link, useSearchParams } from "react-router";
import PageWrapper from "../../components/Layout/PageWrapper";
import Content from "../../components/UI/Layout/Content";
import LeftSidebar from "../../components/UI/Layout/Left";
import styles from "./Spyglass.module.scss";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  HoverCard,
  Loader,
  Paper,
  Space,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  ClockCounterClockwiseIcon,
  MegaphoneIcon,
  XIcon,
} from "@phosphor-icons/react";
import SpyglassContext from "./Spyglass/SpyglassContext";
import { useSpyglassService } from "../../hooks/useSpyglassService";
import { useInteraction } from "../../contexts/InteractionContext";
import { useLayout } from "../../contexts/LayoutContext";
import RightSidebar from "../../components/UI/Layout/Right";
import Nav from "../../components/UI/Layout/Nav";
import TopBar from "../../components/UI/Layout/TopBar";
import SpyglassActions from "./Spyglass/SpyglassActions";
import { useEffect, useState } from "react";
import Textbox from "./Textbox";
import CountUp from "../../components/Utils/Animations/Countup";
import { getNodeTitle } from "../../utils/graph";
import { DisplayOverview } from "../../components/Utils/Spyglass/Overview";
import useRabbithole from "../../hooks/useRabbithole";
import { RabbitholeIcon } from "../../components/Utils/Icons/Icons";
import PaperCard from "../../components/Display/Paper/PaperCard";
import PaperInset from "../../components/Display/Paper/PaperInset";
import Search from "../../components/Search/Search";

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
        scope: currentRabbithole
          ? [currentRabbithole.id.toString()]
          : undefined,
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
          {!initialized && isDownRabbithole && (
            <>
              <Space my="sm" />
              <div className={styles.scopeWrapper}>
                <Stack gap="sm">
                  <Text size="sm" fw="bold" c="dimmed">
                    SCOPE
                  </Text>
                  <Button
                    radius="xl"
                    size="xs"
                    variant="light"
                    color="green"
                    rightSection={
                      <>
                        <ActionIcon
                          variant="subtle"
                          onClick={(e) => {
                            e.stopPropagation();
                            exitRabbithole();
                          }}
                          size="sm"
                          color="green"
                        >
                          <XIcon weight="bold" />
                        </ActionIcon>
                      </>
                    }
                  >
                    <Group
                      gap="xs"
                      wrap="nowrap"
                      style={{ flex: 1, minWidth: 0 }}
                    >
                      <Text
                        w={"100%"}
                        truncate={"end"}
                        size="xs"
                        tt="uppercase"
                        fw="bold"
                        title={currentRabbithole?.name}
                      >
                        {currentRabbithole?.name}
                      </Text>
                    </Group>
                  </Button>
                </Stack>
              </div>
            </>
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
            {overview && (
              <>
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
              </>
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
