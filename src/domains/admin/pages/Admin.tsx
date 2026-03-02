import {
  Button,
  Card,
  Container,
  Grid,
  Group,
  Stack,
  Title,
  Loader,
  CopyButton,
  Text,
} from "@mantine/core";
import PageWrapper from "@core/design/layout/PageWrapper";
import LeftSidebar from "@core/design/components/Layout/Left";
import RightSidebar from "@core/design/components/Layout/Right";
import useFetch from "@core/hooks/useFetch";
import { showNotification } from "@mantine/notifications";
import { ArrowsClockwise, ChatCircleDots, Check, Copy, UsersThree } from "@phosphor-icons/react";
import { Link } from "react-router";
import { useAuth } from "@domains/identity/contexts/AuthContext";
import Content from "@core/design/components/Layout/Content";
import StatusBar from "@core/design/components/Layout/Bottom";
import Nav from "@core/design/components/Layout/Nav";
import TopBar from "@core/design/components/Layout/TopBar";

export default function Admin() {
  const { referralLink } = useAuth();
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
      <TopBar />
      <LeftSidebar />
      <Content>
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
          <Grid.Col span={{ sm: 12 }}>
            <Card withBorder radius="lg">
              <Stack>
                <Title order={3}>Other Stuff</Title>
                <Group>
                  {referralLink && (
                    <CopyButton value={referralLink}>
                      {({ copied, copy }) => {
                        return (
                          <Button
                            onClick={() => {
                              copy();
                            }}
                            variant="default"
                            leftSection={copied ? <Check weight="bold" /> : <Copy weight="bold" />}
                          >
                            <Text>Copy Referral Link</Text>
                          </Button>
                        );
                      }}
                    </CopyButton>
                  )}
                </Group>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>
      </Content>
      <Nav />
      <RightSidebar />
    </PageWrapper>
  );
}
