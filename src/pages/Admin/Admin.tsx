import {
  Button,
  Card,
  Container,
  Grid,
  Group,
  Stack,
  Title,
  Loader,
} from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/LeftSidebar";
import RightSidebar from "../../components/UI/RightSidebar";
import useFetch from "../../hooks/useFetch";
import { showNotification } from "@mantine/notifications";
import {
  ArrowsClockwise,
  ChatCircleDots,
  UsersThree,
} from "@phosphor-icons/react";
import { Link } from "react-router";

export default function Admin() {
  const { load: synchronizeGraph, loading: loadingSynchronizeGraph } = useFetch<
    undefined,
    undefined
  >({
    url: "/graph/synchronize",
    method: "POST",
    onSuccess: () => {
      showNotification({
        title: "Success",
        message: "Successfully synchronized the graph",
      });
    },
    onError: () => {
      showNotification({
        title: "Error",
        message: "Something went wrong synchronizing the graph.",
      });
    },
  });

  return (
    <PageWrapper>
      <LeftSidebar />
      <Container w="100%" mt="lg">
        <Grid>
          <Grid.Col span={{ sm: 12 }}>
            <Title>Admin Panel</Title>
          </Grid.Col>
          <Grid.Col>
            <Card withBorder radius="lg">
              <Stack>
                <Title order={3}>Management</Title>
                <Group>
                  <Link to="/admin/users">
                    <Button leftSection={<UsersThree />} variant="default">
                      Manage Users
                    </Button>
                  </Link>
                  <Link to="/admin/feedback">
                    <Button leftSection={<ChatCircleDots />} variant="default">
                      Review Feedback
                    </Button>
                  </Link>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Card withBorder radius="lg">
              <Stack>
                <Title order={3}>Global Actions</Title>
                <Group>
                  <Button
                    onClick={() => {
                      synchronizeGraph();
                    }}
                    variant="light"
                    disabled={loadingSynchronizeGraph}
                    leftSection={
                      loadingSynchronizeGraph ? (
                        <Loader size="sm" />
                      ) : (
                        <ArrowsClockwise weight="bold" />
                      )
                    }
                  >
                    Synchronize Graphs
                  </Button>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>
      </Container>
      <RightSidebar />
    </PageWrapper>
  );
}
