import {
  ActionIcon,
  Button,
  Card,
  Container,
  CopyButton,
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
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import { useAuth } from "../../contexts/AuthContext";
import { getCurrentTimeOfDay } from "../../utils/datetime";
import useFetch from "../../hooks/useFetch";
import { IIdea, IUserIdeaStats } from "../../../app/database/models/ideas";
import { useLayout } from "../../contexts/LayoutContext";
import {
  CompactIdeaCard,
  StandardIdeaCard,
} from "../../components/Display/Ideas/IdeaCards";
import { getOS } from "../../utils/platform";
import Search from "../../components/Search/Search";
import { useMediaQuery } from "@mantine/hooks";
import {
  ArrowRight,
  HandWaving,
  MagnifyingGlassIcon,
  Plus,
  Scroll,
} from "@phosphor-icons/react";
import { handleCreateNewIdea } from "../../utils/ideas";
import { Link, useNavigate } from "react-router";
import { showNotification } from "@mantine/notifications";
import { useState } from "react";
import { userIsSuperuser } from "../../utils/user";
import { useInteraction } from "../../contexts/InteractionContext";
import Content from "../../components/UI/Layout/Content";

export default function Dashboard() {
  const { user } = useAuth();

  const os = getOS();
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

  const {
    elements: {
      rightSidebar: {
        mode: { set: setRightSidebar },
      },
    },
    leftSidebar: { opened: leftSidebarOpened },
    rightSidebar: { opened: rightSidebarOpened },
  } = useLayout();

  const isMac = os === "macos";
  const primaryKey = isMac ? "Cmd" : "Ctrl";

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
      <LeftSidebar>
        <LeftSidebar.Open>
          <Text c="dimmed" size="sm">
            {getStatusText()}
          </Text>
          <Space my="lg" />
          <Group align="baseline" gap="sm">
            <Title order={3}>Recent Ideas</Title>
            <Link
              to="/ideas"
              style={{
                textDecoration: "none",
              }}
            >
              <Text c="dimmed" size="xs" fw="bold">
                VIEW ALL
              </Text>
            </Link>
          </Group>
          <Space my="sm" />
          <Stack gap="xs">
            {dashboardData?.recentIdeas &&
              dashboardData.recentIdeas.map((idea) => {
                return (
                  <CompactIdeaCard idea={idea} key={idea.id.toString()} link />
                );
              })}
          </Stack>
        </LeftSidebar.Open>
      </LeftSidebar>
      <Content>
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
                  <Link to="/updates">
                    <Button variant="default">
                      <Group>
                        <Scroll />
                        <Text>See latest updates</Text>
                      </Group>
                    </Button>
                  </Link>
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
                  <Link to="/graph">
                    <Button variant="default">
                      <Group>
                        <Text>Your Constellation</Text>
                        <Kbd>{primaryKey} + G</Kbd>
                      </Group>
                    </Button>
                  </Link>
                  <Link to="/spyglass">
                    <Button variant="default">
                      <Group>
                        <Text>Spyglass</Text>
                        <Kbd>{primaryKey} + Shift + /</Kbd>
                      </Group>
                    </Button>
                  </Link>
                  <Link to="/tags">
                    <Button variant="default">
                      <Group>
                        <Text>Manage Tags</Text>
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
                          <StandardIdeaCard idea={idea} link />
                        </Grid.Col>
                      );
                    })}
                </Grid>
              </>
            )}
          </Grid.Col>
        </Grid>
      </Content>
      <RightSidebar>
        <RightSidebar.Collapsed>
          <ActionIcon
            onClick={() => {
              setRightSidebar("open");
            }}
            variant="subtle"
            size="sm"
          >
            <MagnifyingGlassIcon size={16} />
          </ActionIcon>
        </RightSidebar.Collapsed>
        <RightSidebar.Open>
          <Search />
        </RightSidebar.Open>
      </RightSidebar>
    </PageWrapper>
  );
}
