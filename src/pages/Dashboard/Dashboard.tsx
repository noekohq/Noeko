import {
  Card,
  Container,
  Divider,
  Grid,
  Kbd,
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

  return (
    <PageWrapper>
      <LeftSidebar>
        <Text c="dimmed" size="sm">
          {getStatusText()}
        </Text>
      </LeftSidebar>
      <Container py="lg" w="100%">
        <Grid>
          <Grid.Col span={{ sm: 12 }}>
            <Title>
              Good {getCurrentTimeOfDay()}, {user?.firstName}
            </Title>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }} />
          <Grid.Col>
            <Card withBorder radius="lg">
              <Stack align="center" gap="sm">
                <Text>
                  Add an idea <Kbd>{primaryKey} + I</Kbd>
                </Text>
                <Text>
                  Dashboard view <Kbd>{primaryKey} + H</Kbd>
                </Text>
                <Text>
                  Graph view <Kbd>{primaryKey} + G</Kbd>
                </Text>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>
      </Container>
      <RightSidebar>
        {rightSidebarOpened && (
          <Stack>
            <Title order={3}>Recent Ideas</Title>

            {dashboardData?.recentIdeas &&
              dashboardData.recentIdeas.map((idea) => {
                return <IdeaCard idea={idea} key={idea.id.toString()} link />;
              })}
          </Stack>
        )}
      </RightSidebar>
    </PageWrapper>
  );
}
