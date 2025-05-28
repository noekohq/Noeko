import {
  Button,
  Card,
  Container,
  Divider,
  Flex,
  Grid,
  Group,
  Kbd,
  Space,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/LeftSidebar";
import RightSidebar from "../../components/UI/RightSidebar";
import { useAuth } from "../../contexts/AuthContext";
import { getCurrentTimeOfDay } from "../../utils/datetime";
import useFetch from "../../hooks/useFetch";
import { IIdea, IUserIdeaStats } from "../../../app/database/models/ideas";
import { useLayout } from "../../contexts/LayoutContext";
import { getNodeDescription, getNodeSubtitle } from "../../utils/graph";
import IdeaCard from "../../components/Display/Ideas/IdeaCard";
import { getMetaKeys, getOS } from "../../utils/platform";
import { SearchBar } from "../../components/Search/SearchBar";
import styles from "./Dashboard.module.scss";
import Search from "../../components/Search/Search";
import { useMediaQuery } from "@mantine/hooks";
import { ArrowRight, HandWaving, Plus } from "@phosphor-icons/react";
import { handleCreateNewIdea } from "../../utils/ideas";
import { Link, useNavigate } from "react-router";
import { showNotification } from "@mantine/notifications";
import { useState } from "react";
import { userIsSuperuser } from "../../utils/user";
import { useInteraction } from "../../contexts/InteractionContext";

export default function Dashboard() {
  const { user } = useAuth();

  const os = getOS();
  const { data: dashboardData } = useFetch<
    undefined,
    { recentIdeas: IIdea[]; ideaStats: IUserIdeaStats }
  >({
    url: "/dashboard",
    runOnMount: true,
    onError: (err) => {
      console.error("Error getting dashboard data: ", err);
    },
  });

  const {
    leftSidebar: { opened: leftSidebarOpened },
    rightSidebar: { opened: rightSidebarOpened },
  } = useLayout();

  const isMac = os === "macos";
  const primaryKey = isMac ? "Cmd" : "Ctrl";

  const totalIdeas = dashboardData?.ideaStats.total;

  const getStatusText = () => {
    if (totalIdeas === undefined) {
      return "Loading...";
    }
    if (totalIdeas && totalIdeas > 0) {
      return `You have ${totalIdeas} idea${totalIdeas === 1 ? "" : "s"}!`;
    }
    return "Hello there!";
  };

  const navigate = useNavigate();

  const [loadingNewIdea, setLoadingNewIdea] = useState(false);

  const handleNewIdea = async () => {
    setLoadingNewIdea(true);
    await handleCreateNewIdea(
      (i) => {
        navigate(`idea/${i.id.toString()}`);
      },
      (err) => {
        showNotification({
          title: "Something went wrong",
          message: "Something went wrong adding the note",
        });
      },
    );
    showNotification({
      title: "Idea created",
      message: "Created a new note",
    });
    setLoadingNewIdea(false);
  };

  const isMobile = useMediaQuery("(max-width: 768px)");

  const isSuperuser = userIsSuperuser(user);

  const {
    actions: {
      newIdea,
      layout: {
        rightSidebar: { toggle: toggleRightSidebar },
      },
    },
  } = useInteraction();

  return (
    <PageWrapper>
      <LeftSidebar forceCollapsed={isMobile}>
        {!isMobile && (
          <>
            <Text c="dimmed" size="sm">
              {getStatusText()}
            </Text>
            <Space my="md" />
            {leftSidebarOpened && (
              <Stack>
                <Group align="baseline" gap="sm">
                  <Title order={3}>Recent Ideas</Title>
                  <Link
                    to="/ideas"
                    style={{
                      textDecoration: "none",
                    }}
                  >
                    <Text c="dimmed" size="xs" fw="bold">
                      VIEW ALL <ArrowRight />
                    </Text>
                  </Link>
                </Group>
                {dashboardData?.recentIdeas &&
                  dashboardData.recentIdeas.map((idea) => {
                    return (
                      <IdeaCard idea={idea} key={idea.id.toString()} link />
                    );
                  })}
              </Stack>
            )}
          </>
        )}
      </LeftSidebar>
      <Container py="lg" w="100%">
        <Grid>
          <Grid.Col span={{ sm: 12 }}>
            <Group>
              <HandWaving weight="bold" size="36px" />
              <Title>
                Good {getCurrentTimeOfDay()}, {user?.firstName}
              </Title>
            </Group>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }} />
          <Grid.Col>
            {!isMobile && (
              <Card withBorder radius="lg">
                <Flex wrap="wrap" direction="column" align="center" gap="md">
                  <Button variant="default">
                    <Group>
                      <Text>Dashboard view</Text>
                      <Kbd>{primaryKey} + H</Kbd>
                    </Group>
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => {
                      newIdea();
                    }}
                  >
                    <Group>
                      <Text>Add an idea</Text>
                      <Kbd>{primaryKey} + I</Kbd>
                    </Group>
                  </Button>
                  <Link to="/ideas">
                    <Button variant="default">
                      <Group>
                        <Text>All ideas</Text>
                        <Kbd>{primaryKey} + B</Kbd>
                      </Group>
                    </Button>
                  </Link>
                  <Button
                    variant="default"
                    onClick={() => {
                      toggleRightSidebar();
                    }}
                  >
                    <Group>
                      <Text>Find an idea</Text>
                      <Kbd>/</Kbd>
                    </Group>
                  </Button>
                  <Link to="/graph">
                    <Button variant="default">
                      <Group>
                        <Text>Graph view</Text>
                        <Kbd>{primaryKey} + G</Kbd>
                      </Group>
                    </Button>
                  </Link>
                  <Link to="/spyglass">
                    <Button variant="default">
                      <Group>
                        <Text>Spyglass</Text>
                        <Kbd>{primaryKey} + /</Kbd>
                      </Group>
                    </Button>
                  </Link>
                  <Link to="/settings">
                    <Button variant="default">
                      <Group>
                        <Text>Settings</Text>
                        <Kbd>{primaryKey} + .</Kbd>
                      </Group>
                    </Button>
                  </Link>
                  {isSuperuser && (
                    <Link to="/admin">
                      <Button variant="default">
                        <Group>
                          <Text>Admin Panel</Text>
                          <Kbd>{primaryKey} + ;</Kbd>
                        </Group>
                      </Button>
                    </Link>
                  )}
                </Flex>
              </Card>
            )}
            {isMobile && (
              <>
                <Group justify="right">
                  <Button
                    variant="light"
                    rightSection={<Plus />}
                    onClick={() => {
                      handleNewIdea();
                    }}
                  >
                    New Idea
                  </Button>
                </Group>
                <Divider my="md" />
                <Text c="dimmed" size="sm">
                  {getStatusText()}
                </Text>
                <Space my="md" />
                <Search />
                <Space my="md" />
                <Grid grow>
                  <Grid.Col span={{ sm: 12 }}>
                    <Group align="baseline" gap="sm">
                      <Title order={3}>Recent Ideas</Title>
                      <Link
                        to="/ideas"
                        style={{
                          textDecoration: "none",
                        }}
                      >
                        <Text c="dimmed" size="xs" fw="bold">
                          VIEW ALL <ArrowRight />
                        </Text>
                      </Link>
                    </Group>
                  </Grid.Col>
                  {dashboardData?.recentIdeas &&
                    dashboardData.recentIdeas.map((idea) => {
                      return (
                        <Grid.Col span={6} key={idea.id.toString()}>
                          <IdeaCard idea={idea} link />
                        </Grid.Col>
                      );
                    })}
                </Grid>
              </>
            )}
          </Grid.Col>
        </Grid>
      </Container>
      <RightSidebar
        forceCollapsed={isMobile}
        openOnShortcut={[{ key: "/" }]}
        defaultClosed={isMobile}
      >
        {!isMobile && rightSidebarOpened && <Search />}
      </RightSidebar>
    </PageWrapper>
  );
}
