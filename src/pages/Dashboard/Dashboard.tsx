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
import { IIdea, IUserIdeaStats } from "../../../app/database/models/ideas";
import {
  ArticleIcon,
  BellIcon,
  CaretDownIcon,
  CaretUpIcon,
  HandWavingIcon,
  MegaphoneIcon,
  MoonStarsIcon,
  NotificationIcon,
  ScrollIcon,
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
import { IDashboard } from "../../../app/services/Dashboard";
import { useDisclosure } from "@mantine/hooks";
import IdeaCard from "../../components/Display/Ideas/Interactions/IdeaCard";
import { Link } from "react-router";

type ILoadedWidget = {
  id: string;
  Component: React.LazyExoticComponent<React.ComponentType<any>>;
  config: IWidgetConfig;
};

export default function Dashboard() {
  const [LoadedWidgets, setLoadedWidgets] = useState<ILoadedWidget[]>([]);
  const { isMobile } = useLayout();

  const defaultWidgets: IAvailableWidgets[] = isMobile
    ? ["scratchpad", "rabbitholeList"]
    : ["scratchpad", "rabbitholeList", "heatmap"];

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

  const { data: dashboardData } = useFetch<undefined, IDashboard>({
    url: "/dashboard",
    runOnMount: true,
    onError: (err) => {
      console.error("Error getting dashboard data: ", err);
    },
  });

  const totalIdeas = dashboardData?.ideaStats?.total;
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

  const [recentOpened, { toggle: toggleRecent }] = useDisclosure(false);
  const latestIdea = dashboardData?.recentIdeas?.[0];

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
          {!dashboardData?.recentIdeas?.length && (
            <>
              <Text size="sm" c="gray" mb="md">
                You have no ideas yet!
              </Text>
              <Button variant="light">Add an idea!</Button>
            </>
          )}
          <Stack gap="xs">
            {latestIdea && (
              <Card withBorder radius="lg">
                <Stack>
                  <Text size="xs" c="dimmed">
                    Latest idea...
                  </Text>
                  <IdeaCard idea={latestIdea} />
                  <Button
                    onClick={() => {
                      toggleRecent();
                    }}
                    size="xs"
                    variant="subtle"
                    color="gray"
                    rightSection={
                      recentOpened ? <CaretUpIcon /> : <CaretDownIcon />
                    }
                  >
                    {recentOpened ? "Hide" : "Show"} Recent
                  </Button>
                </Stack>
              </Card>
            )}
            <Collapse in={recentOpened}>
              <Stack gap="xs">
                {dashboardData?.recentIdeas &&
                  dashboardData.recentIdeas
                    .filter(
                      (i) => i.id.toString() !== latestIdea?.id.toString(),
                    )
                    .map((idea) => {
                      return <IdeaCard idea={idea} key={idea.id.toString()} />;
                    })}
              </Stack>
            </Collapse>
          </Stack>
        </LeftSidebar.Open>
      </LeftSidebar>
      <Content>
        {/* <TopBar /> */}
        {/* <Flex
          justify={"center"}
          align="center"
          direction="column"
          gap="md"
          h="50vh"
        >
          <Text c="dimmed">A new dashboard is coming soon...</Text>
          <Group justify="space-around">
            <Link to="/updates">
              <Button variant="default">
                <Group>
                  <ScrollIcon />
                  <Text>Latest Updates</Text>
                </Group>
              </Button>
            </Link>
            <Button variant="default" onClick={openFeedbackModal}>
              <Group>
                <MegaphoneIcon />
                <Text>Leave Feedback</Text>
              </Group>
            </Button>
          </Group>
        </Flex> */}
        <Grid grow>
          <Grid.Col span={12}>
            <TopBar />
          </Grid.Col>
          <Grid.Col
            span={12}
            style={{
              height: "100%",
            }}
          ></Grid.Col>
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
          <Grid.Col span={12}>
            <Stack align="center">
              <Text size="sm" ta="center">
                More widgets coming soon...{" "}
              </Text>
              <Button
                color="gray"
                size="xs"
                variant="light"
                leftSection={<MegaphoneIcon />}
              >
                Suggest one!
              </Button>
            </Stack>
          </Grid.Col>
        </Grid>
      </Content>
      <StatusBar>
        <StatusBar.Showing>
          <TimeButton />
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
    <Group justify="space-between" py="md">
      {!isMobile && (
        <Group h="var(--status-bar-height)">
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
            to="/ideas"
            style={{
              height: "100%",
              textDecoration: "none",
            }}
          >
            <StatusButton leftSection={<ArticleIcon />}>
              {user?.totalIdeas}
            </StatusButton>
          </Link>
        </Group>
      )}
      <Title order={2}>
        <Group gap="xs">
          <HandWavingIcon weight="bold" />
          Welcome back {user?.firstName}, your Qwest continues.
        </Group>
      </Title>
      <Group
        h="var(--status-bar-height)"
        justify={isMobile ? "space-between" : "flex-start"}
        w={isMobile ? "100%" : undefined}
      >
        {isMobile && (
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
        )}
        <Link
          to="/ideas"
          style={{
            height: "100%",
            textDecoration: "none",
          }}
        >
          <StatusButton leftSection={<ArticleIcon />}>
            {user?.totalIdeas}
          </StatusButton>
        </Link>
      </Group>
    </Group>
  );
}
