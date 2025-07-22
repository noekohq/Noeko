import { Button, Grid, Group, Text } from "@mantine/core";
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
import { IIdea, IUserIdeaStats } from "../../../app/database/models/ideas";
import {
  ArticleIcon,
  BellIcon,
  HandWavingIcon,
  MoonStarsIcon,
  NotificationIcon,
  Sun,
  SunIcon,
} from "@phosphor-icons/react";
import { useAuth } from "../../contexts/AuthContext";
import { useInteraction } from "../../contexts/InteractionContext";
import { useSettings } from "../../contexts/SettingsContext";
import { useLayout } from "../../contexts/LayoutContext";
import StatusBar from "../../components/UI/Layout/Bottom";
import { getCurrentTimeFormatted } from "../../utils/datetime";
import StatusButton from "../../components/Display/Interactions/StatusButton";
import TimeButton from "../../components/Display/Interactions/TimeButton";

type ILoadedWidget = {
  id: string;
  Component: React.LazyExoticComponent<React.ComponentType<any>>;
  config: IWidgetConfig;
};

export default function Dashboard() {
  const [LoadedWidgets, setLoadedWidgets] = useState<ILoadedWidget[]>([]);

  const defaultWidgets: IAvailableWidgets[] = [
    "scratchpad",
    "taskList",
    "rabbitholeList",
    "heatmap",
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

  console.log("Loaded widgets: ", LoadedWidgets);
  const { data: dashboardData } = useFetch<
    undefined,
    { recentIdeas: IIdea[]; ideaStats: IUserIdeaStats; totalUsers: number }
  >({
    url: "/dashboard",
    runOnMount: true,
    onError: (err) => {
      console.error("Error getting dashboard data: ", err);
    },
  });

  const totalIdeas = dashboardData?.ideaStats.total;
  const totalUsers = dashboardData?.totalUsers;

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

  return (
    <PageWrapper>
      <LeftSidebar>
        <LeftSidebar.Open>
          <Text size="sm" c="dark.2">
            {getStatusText()}
          </Text>
        </LeftSidebar.Open>
      </LeftSidebar>
      <Content>
        <Grid grow>
          <Grid.Col span={12}>
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
              >
                <WidgetWrapper>
                  <Component />
                </WidgetWrapper>
              </Grid.Col>
            );
          })}
        </Grid>
      </Content>
      <StatusBar>
        <StatusBar.Showing>
          <TimeButton />
        </StatusBar.Showing>
      </StatusBar>
      <RightSidebar>
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
    <Group justify="space-between" h="var(--status-bar-height)">
      <Group h="100%">
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
        {isMobile && (
          <StatusButton leftSection={<ArticleIcon />}>
            {user?.totalIdeas}
          </StatusButton>
        )}
      </Group>
      <Group gap="xs" h="100%">
        <HandWavingIcon weight="bold" />
        <Text size="md">
          Welcome back {user?.firstName}, your Qwest continues.
        </Text>
      </Group>
      {!isMobile && (
        <Group h="100%">
          <StatusButton leftSection={<ArticleIcon />}>
            {user?.totalIdeas}
          </StatusButton>
        </Group>
      )}
    </Group>
  );
}
