import {
  Button,
  Card,
  Center,
  Collapse,
  Flex,
  Grid,
  Group,
  Stack,
  Text,
  Title,
  Transition,
} from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import widgets from "../../components/Widgets/Index";
import styles from "./Dashboard.module.scss";
import type {
  IAvailableWidgets,
  IWidgetConfig,
} from "../../components/Widgets/index.d";
import { lazy, useEffect, useState } from "react";
import Content from "../../components/UI/Layout/Content";
import WidgetWrapper from "../../components/Widgets/Wrapper";
import Search from "../../components/Search/Search";
import useFetch from "../../hooks/useFetch";
import {
  IIdea,
  ISafeIdea,
  IUserIdeaStats,
} from "../../../app/database/models/ideas";
import {
  ArticleIcon,
  BellIcon,
  CaretDownIcon,
  CaretUpIcon,
  ClockClockwiseIcon,
  HandWavingIcon,
  IntersectSquareIcon,
  MegaphoneIcon,
  MoonStarsIcon,
  ShareNetworkIcon,
  SunIcon,
  TagIcon,
  UniteSquareIcon,
} from "@phosphor-icons/react";
import { useAuth } from "../../contexts/AuthContext";
import { useInteraction } from "../../contexts/InteractionContext";
import { useSettings } from "../../contexts/SettingsContext";
import { useLayout } from "../../contexts/LayoutContext";
import StatusBar from "../../components/UI/Layout/Bottom";
import { getCurrentTimeFormatted } from "../../utils/datetime";
import StatusButton from "../../components/Display/Interactions/StatusButton";
import TimeButton from "../../components/Display/Interactions/TimeButton";
import { IDashboard } from "../../../app/services/Dashboard";
import IdeaCard from "../../components/Display/Ideas/Interactions/IdeaCard";
import { Link } from "react-router";
import ExpandableCardStack from "../../components/Display/Interactions/ExpandableCardStack";

type ILoadedWidget = {
  id: string;
  Component: React.LazyExoticComponent<React.ComponentType<any>>;
  config: IWidgetConfig;
};

export default function Dashboard() {
  const [LoadedWidgets, setLoadedWidgets] = useState<ILoadedWidget[]>([]);
  const { isMobile } = useLayout();

  const defaultWidgets: IAvailableWidgets[] = isMobile
    ? ["scratchpad", "taskList", "rabbitholeList", "tagBreakdown"]
    : ["scratchpad", "taskList", "rabbitholeList", "tagBreakdown"];

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

  const { data: dashboardData, load: loadDashboard } = useFetch<
    undefined,
    IDashboard
  >({
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

  const { data: centralIdeas, load: loadCentral } = useFetch<
    undefined,
    ISafeIdea[]
  >({
    url: "/dashboard/central-ideas",
    onError: (err) => {
      console.error("Error getting central ideas: ", err);
    },
  });

  useEffect(() => {
    loadCentral();
  }, []);

  const { data: semanticCentralIdeas, load: loadSemanticCentral } = useFetch<
    undefined,
    ISafeIdea[]
  >({
    url: "/dashboard/semantic-central-ideas",
    runOnMount: true,
    onError: (err) => {
      console.error("Error getting central ideas: ", err);
    },
  });

  useEffect(() => {
    loadSemanticCentral();
  }, []);

  const getStatusText = () => {
    if (totalIdeas === undefined) {
      return "Loading...";
    }
    let text = "Hello there!";
    if (totalUsers) {
      text += ` You are using Qwest with ${totalUsers - 1} other people.`;
    }
    if (totalIdeas && totalIdeas > 0) {
      text += ` You have ${totalIdeas} idea${totalIdeas === 1 ? "" : "s"}!`;
    }
    return text;
  };

  const {
    actions: {
      newIdea,
      feedback: { openFeedbackModal },
    },
  } = useInteraction();

  return (
    <PageWrapper>
      <LeftSidebar startOpened={!isMobile}>
        <LeftSidebar.Open>
          <Text size="sm" c="dark.2" mb="lg">
            {getStatusText()}
          </Text>
          <Stack>
            <Transition
              mounted={!!dashboardData?.recentIdeas}
              transition="fade-up"
            >
              {(styles) => {
                return (
                  <div style={styles}>
                    <ExpandableCardStack
                      topLabel={
                        <Group gap="xs">
                          <ClockClockwiseIcon weight="bold" />
                          Latest idea...
                        </Group>
                      }
                      expandLabel="All recent..."
                      cards={
                        dashboardData?.recentIdeas?.map((idea) => (
                          <IdeaCard key={idea.id.toString()} idea={idea} />
                        )) ?? []
                      }
                    />
                  </div>
                );
              }}
            </Transition>
            <Transition mounted={!!centralIdeas?.length} transition="fade-up">
              {(styles) => {
                return (
                  <div style={styles}>
                    <ExpandableCardStack
                      topLabel={
                        <Group gap="xs">
                          <UniteSquareIcon weight="bold" />
                          Most Connected Idea...
                        </Group>
                      }
                      expandLabel="Highest connected..."
                      cards={
                        centralIdeas?.map((idea) => (
                          <IdeaCard key={idea.id.toString()} idea={idea} />
                        )) ?? []
                      }
                    />
                  </div>
                );
              }}
            </Transition>
            <Transition
              mounted={!!semanticCentralIdeas?.length}
              transition="fade-up"
            >
              {(styles) => {
                return (
                  <div style={styles}>
                    <ExpandableCardStack
                      topLabel={
                        <Group gap="xs">
                          <IntersectSquareIcon weight="bold" />
                          Most Relevant Idea...
                        </Group>
                      }
                      expandLabel="Most relevant..."
                      cards={
                        semanticCentralIdeas?.map((idea) => (
                          <IdeaCard key={idea.id.toString()} idea={idea} />
                        )) ?? []
                      }
                    />
                  </div>
                );
              }}
            </Transition>
          </Stack>
        </LeftSidebar.Open>
      </LeftSidebar>
      <Content>
        <div className={styles.dashboard}>
          <Grid grow>
            <Grid.Col span={12} py={0}>
              <TopBar />
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
      <StatusBar>
        <StatusBar.Showing>
          <Group gap="xs" h="100%">
            <TimeButton />
            <Link
              to="/ideas/shared"
              style={{ height: "100%" }}
              title="Ideas shared with you"
            >
              <StatusButton>
                <ShareNetworkIcon />
              </StatusButton>
            </Link>
          </Group>
        </StatusBar.Showing>
      </StatusBar>
      <RightSidebar startOpened>
        <RightSidebar.Open>
          <Search />
        </RightSidebar.Open>
      </RightSidebar>
    </PageWrapper>
  );
}

interface ITopBarProps {}

function TopBar() {
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
          Your Qwest continues.
        </Title>
      </Stack>
      <Flex
        wrap={"nowrap"}
        h={
          isMobile
            ? "calc(var(--status-bar-height) * 2)"
            : "var(--status-bar-height)"
        }
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
