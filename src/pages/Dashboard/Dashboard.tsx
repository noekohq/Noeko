import { Box, Center, Flex, Grid, Group, Loader, Stack, Text, Title } from "@mantine/core";
import PageWrapper from '@/components/Layout/PageWrapper';
import LeftSidebar from '@core/design/components/Layout/Left';
import RightSidebar from '@core/design/components/Layout/Right';
import widgets from '@/components/Widgets/Index';
import styles from "./Dashboard.module.scss";
import type { IAvailableWidgets, IWidgetConfig } from '@/components/Widgets/index.d';
import { lazy, useEffect, useRef, useState } from "react";
import Content from '@core/design/components/Layout/Content';
import WidgetWrapper from '@/components/Widgets/Wrapper';
import Search from '@/components/Search/Search';
import useFetch from '@/hooks/useFetch';
import { IIdeaSortFields, ISafeIdea } from '../../../shared/types/idea';
import {
  ArticleIcon,
  ClockClockwiseIcon,
  ClockCounterClockwiseIcon,
  ClockIcon,
  HandWavingIcon,
  MoonStarsIcon,
  SunIcon,
  TagIcon,
} from "@phosphor-icons/react";
import { useAuth } from '@/contexts/AuthContext';
import { useInteraction } from '@/contexts/InteractionContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useLayout } from '@/contexts/LayoutContext';
import { getCurrentTimeFormatted, getCurrentTimeOfDay } from '@core/utils/datetime';
import StatusButton from '@/components/Display/Interactions/StatusButton';
import { IDashboard } from '../../../app/services/Dashboard';
import { Link, useNavigate } from "react-router";
import Selection from '@/components/Display/Interactions/Selection';
import Nav from '@core/design/components/Layout/Nav';
import TopBar from '@core/design/components/Layout/TopBar';
import PaperThing from '@core/design/components/Paper/Things/PaperThing';
import { getThingPropsFromConnectable } from '@core/design/components/Paper/Things/thingUtils';

type ILoadedWidget = {
  id: string;
  Component: React.LazyExoticComponent<React.ComponentType<any>>;
  config: IWidgetConfig;
};

export default function Dashboard() {
  const [LoadedWidgets, setLoadedWidgets] = useState<ILoadedWidget[]>([]);
  const { isMobile } = useLayout();

  const defaultWidgets: IAvailableWidgets[] = [
    "constellation",
    "taskList",
    // "serendipity",
    "pins",
  ];

  const loadWidgets = async (): Promise<ILoadedWidget[]> => {
    const loaded: ILoadedWidget[] = [];
    for (const widgetId of defaultWidgets) {
      const importFn = widgets[widgetId];
      const Component = lazy(importFn);
      const module = await importFn();
      const config = module.config;

      loaded.push({
        id: widgetId,
        Component,
        config,
      });
    }
    setLoadedWidgets(loaded);
    return loaded;
  };

  useEffect(() => {
    loadWidgets();
  }, []);

  const {
    data: dashboardData,
    load: loadDashboard,
    loading: loadingDashboard,
  } = useFetch<undefined, IDashboard>({
    url: "/dashboard",
    onError: (err) => {
      console.error("Error getting dashboard data: ", err);
    },
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const totalIdeas = dashboardData?.ideaStats?.total;
  const totalUsers = dashboardData?.totalUsers;

  const {
    data: centralIdeas,
    load: loadCentral,
    loading: loadingCentral,
  } = useFetch<
    undefined,
    (ISafeIdea & {
      incoming: number;
      outgoing: number;
      total: number;
    })[]
  >({
    url: "/dashboard/central-ideas",
    onError: (err) => {
      console.error("Error getting central ideas: ", err);
    },
  });

  useEffect(() => {
    loadCentral();
  }, []);

  const {
    data: semanticCentralIdeas,
    load: loadSemanticCentral,
    loading: loadingSemanticCentral,
  } = useFetch<undefined, ISafeIdea[]>({
    url: "/dashboard/semantic-central-ideas",
    runOnMount: true,
    onError: (err) => {
      console.error("Error getting central ideas: ", err);
    },
  });

  useEffect(() => {
    loadSemanticCentral();
  }, []);

  const {
    actions: {
      newIdea,
      feedback: { openFeedbackModal },
    },
  } = useInteraction();

  return (
    <PageWrapper>
      <TopBar />
      <LeftSidebar startOpened={!isMobile}>
        <LeftSidebar.Open>
          <JumpBackIn />
        </LeftSidebar.Open>
      </LeftSidebar>
      <Content>
        <div className={styles.dashboard}>
          <Grid>
            <Grid.Col span={12} py={0}>
              <Header />
            </Grid.Col>
            {LoadedWidgets.map(({ id, Component, config }) => {
              return (
                <Grid.Col
                  span={{
                    sm: 12,
                    md: config.columns.default,
                  }}
                  key={id}
                  style={{
                    height: "fit-content",
                  }}
                >
                  <WidgetWrapper>
                    <Component />
                  </WidgetWrapper>
                </Grid.Col>
              );
            })}
          </Grid>
        </div>
      </Content>
      <Nav />
      <RightSidebar startOpened={!isMobile}>
        <RightSidebar.Open>
          <Search />
        </RightSidebar.Open>
      </RightSidebar>
    </PageWrapper>
  );
}

interface IHeaderProps {}

function Header() {
  const { user } = useAuth();

  const { isMobile } = useLayout();
  const {
    ui: {
      theme: {
        scheme: { set: setScheme, get: currentScheme },
      },
    },
  } = useSettings();

  return (
    <Group justify="space-between" py="sm" wrap="nowrap">
      <Stack gap="0" align="flex-start" justify="center" w="100%">
        <Title order={2} ta="center">
          <Group gap="xs">
            Welcome back {user?.firstName}!
            <HandWavingIcon weight="bold" />
          </Group>
        </Title>
        <Title p={0} m={0} order={4} c="dimmed">
          Good {getCurrentTimeOfDay()}, it's {getCurrentTimeFormatted()}.
        </Title>
      </Stack>
      <Flex
        wrap={"nowrap"}
        h={isMobile ? "calc(var(--status-bar-height) * 2)" : "var(--status-bar-height)"}
        direction={isMobile ? "column" : "row"}
        gap="xs"
      >
        <Group gap="xs" wrap="nowrap" h="100%">
          <StatusButton
            onClick={() => {
              if (currentScheme === "dark") {
                setScheme("light");
              } else {
                setScheme("dark");
              }
            }}
          >
            {currentScheme === "light" ? (
              <SunIcon weight="bold" />
            ) : (
              <MoonStarsIcon weight="bold" />
            )}
          </StatusButton>
          <Link
            to="/tags"
            style={{
              height: "100%",
              textDecoration: "none",
            }}
          >
            <StatusButton>
              <TagIcon weight="bold" />
            </StatusButton>
          </Link>
        </Group>
        <Link
          to="/ideas"
          style={{
            height: "100%",
            textDecoration: "none",
          }}
        >
          <StatusButton
            leftSection={<ArticleIcon />}
            style={{
              width: "100%",
            }}
          >
            {user?.totalIdeas}
          </StatusButton>
        </Link>
      </Flex>
    </Group>
  );
}

function JumpBackIn() {
  const [sortField, setSortField] = useState<IIdeaSortFields>("viewedAt");
  const [start, setStart] = useState(0);
  const limit = 25;
  const [allIdeas, setAllIdeas] = useState<ISafeIdea[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const {
    data: newIdeas,
    loading,
    load: getPage,
  } = useFetch<undefined, ISafeIdea[]>({
    url: "/ideas",
    query: {
      sortField: sortField,
      sortDirection: "desc",
      limit: limit.toString(),
      start: start.toString(),
    },
    runOnDependencies: [start, sortField],
    onSuccess: (d) => {
      if (start === 0) {
      }
    },
  });

  useEffect(() => {
    if (start === 0 && !loading) {
      getPage();
    }
  }, [start]);

  useEffect(() => {
    if (newIdeas) {
      setAllIdeas((prevIdeas) => {
        const existingIds = new Set(prevIdeas.map((idea) => idea.id));
        const uniqueNewIdeas = newIdeas.filter((idea) => !existingIds.has(idea.id));
        return [...prevIdeas, ...uniqueNewIdeas];
      });
      setHasMore(newIdeas.length === limit);
    }
  }, [newIdeas]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          setStart((prevStart) => prevStart + limit);
        }
      },
      {
        root: scrollContainer,
        threshold: 0.01,
        rootMargin: "0px 0px 800px 0px",
      }
    );

    const currentObserverTarget = observerTarget.current;
    if (currentObserverTarget) {
      observer.observe(currentObserverTarget);
    }

    return () => {
      if (currentObserverTarget) {
        observer.unobserve(currentObserverTarget);
      }
    };
  }, [hasMore, loading, observerTarget.current, scrollContainerRef.current]);

  useEffect(() => {
    setAllIdeas([]);
    setStart(0);
    setHasMore(true);
  }, [sortField]);

  const firstIdea = allIdeas?.[0];
  const rest = firstIdea ? allIdeas.slice(1, allIdeas.length) : allIdeas;

  return (
    <div className={styles.think}>
      <Group mb="md">
        <Text size="sm" c="dark.4" fw="bold">
          JUMP BACK IN
        </Text>
        <Selection
          label="View by"
          initialValue={sortField}
          options={[
            {
              label: "Viewed",
              value: "viewedAt" as IIdeaSortFields,
              icon: <ClockCounterClockwiseIcon />,
            },
            {
              label: "Created",
              value: "createdAt" as IIdeaSortFields,
              icon: <ClockIcon />,
            },
            {
              label: "Updated",
              value: "updatedAt" as IIdeaSortFields,
              icon: <ClockClockwiseIcon />,
            },
          ]}
          onSelect={(v) => {
            setSortField(v as IIdeaSortFields);
          }}
        />
      </Group>
      <div ref={scrollContainerRef} className={styles.scrollArea}>
        <Stack gap="sm">
          {!!firstIdea && (
            <Box
              px="sm"
              py="xs"
              style={{
                border: "1px solid var(--mantine-color-dark-7)",
                borderRadius: "var(--mantine-radius-lg)",
              }}
            >
              <Stack gap="xs">
                <Text size="xs" c="dimmed" fw="bold">
                  SUGGESTED
                </Text>
                <PaperThing
                  {...getThingPropsFromConnectable(
                    {
                      ...firstIdea,
                      type: "idea",
                    },
                    {},
                    true
                  )}
                />
              </Stack>
            </Box>
          )}
          {rest?.map((idea) => {
            return (
              <PaperThing
                key={idea.id.toString()}
                {...getThingPropsFromConnectable({ ...idea, type: "idea" }, {}, true)}
              />
            );
          })}
          {allIdeas.length === 0 && (
            <Text size="sm" c="dimmed">
              No ideas yet.
            </Text>
          )}
          {hasMore && !loading && <div ref={observerTarget} style={{ height: "1px" }} />}
          {loading && (
            <Group justify="center">
              <Loader size="sm" />
            </Group>
          )}
          {!hasMore && !loading && allIdeas.length > 0 && (
            <Center>
              <Text size="sm" c="dimmed">
                That's all :)
              </Text>
            </Center>
          )}
        </Stack>
      </div>
    </div>
  );
}
