import {
  Button,
  Card,
  Container,
  Divider,
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
import { Plus } from "@phosphor-icons/react";
import { handleCreateNewIdea } from "../../utils/ideas";
import { useNavigate } from "react-router";
import { showNotification } from "@mantine/notifications";

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
  console.log("Dashboard data: ", dashboardData);

  const {
    leftSidebar: { opened: leftSidebarOpened },
    rightSidebar: { opened: rightSidebarOpened },
  } = useLayout();

  const isMac = os === "macos";
  const primaryKey = isMac ? "Cmd" : "Ctrl";

  const totalIdeas = dashboardData?.ideaStats.total;

  const getStatusText = () => {
    if (totalIdeas) {
      return `You have ${totalIdeas} idea${totalIdeas === 1 ? "" : "s"}!`;
    }
    return "Loading...";
  };

  const navigate = useNavigate();

  const handleNewIdea = async () => {
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
  };

  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <PageWrapper>
      <LeftSidebar stayCollapsed={isMobile}>
        {!isMobile && (
          <>
            <Text c="dimmed" size="sm">
              {getStatusText()}
            </Text>
            <Space my="md" />
            {leftSidebarOpened && (
              <Stack>
                <Title order={3}>Recent Ideas</Title>
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
      <Container py="lg" w="100%" pt={isMobile ? "10vh" : ""}>
        <Grid>
          <Grid.Col span={{ sm: 12 }}>
            <Title>
              Good {getCurrentTimeOfDay()}, {user?.firstName}
            </Title>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }} />
          <Grid.Col>
            {!isMobile && (
              <Card withBorder radius="lg">
                <Stack align="center" gap="sm">
                  <Group>
                    <Text>Add an idea </Text>
                    <Kbd>{primaryKey} + I</Kbd>
                  </Group>
                  <Group>
                    <Text>Dashboard view</Text>
                    <Kbd>{primaryKey} + H</Kbd>
                  </Group>
                  <Group>
                    <Text>Graph view</Text>
                    <Kbd>{primaryKey} + G</Kbd>
                  </Group>
                  <Group>
                    <Text>Search ideas</Text>
                    <Kbd>/</Kbd>
                  </Group>
                </Stack>
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
                    <Title order={3}>Recent Ideas</Title>
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
      <RightSidebar stayCollapsed={isMobile}>
        {!isMobile && rightSidebarOpened && <Search />}
      </RightSidebar>
    </PageWrapper>
  );
}
