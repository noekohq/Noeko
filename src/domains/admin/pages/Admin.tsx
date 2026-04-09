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
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";

export default function Admin() {
  const { i18n } = useLingui();
  const { referralLink } = useAuth();
  const { load: synchronizeGraph, loading: loadingSynchronizeGraph } = useFetch<
    undefined,
    undefined
  >({
    url: "/graph/synchronize",
    method: "POST",
    onSuccess: () => {
      showNotification({
        title: i18n._(t`Success`),
        message: i18n._(t`Successfully synchronized the graph`),
      });
    },
    onError: () => {
      showNotification({
        title: i18n._(t`Error`),
        message: i18n._(t`Something went wrong synchronizing the graph.`),
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
            <Title>
              <Trans>Admin Panel</Trans>
            </Title>
          </Grid.Col>
          <Grid.Col>
            <Card withBorder radius="lg">
              <Stack>
                <Title order={3}>
                  <Trans>Management</Trans>
                </Title>
                <Group>
                  <Link to="/admin/users">
                    <Button leftSection={<UsersThree />} variant="default">
                      <Trans>Manage Users</Trans>
                    </Button>
                  </Link>
                  <Link to="/admin/feedback">
                    <Button leftSection={<ChatCircleDots />} variant="default">
                      <Trans>Review Feedback</Trans>
                    </Button>
                  </Link>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Card withBorder radius="lg">
              <Stack>
                <Title order={3}>
                  <Trans>Global Actions</Trans>
                </Title>
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
                    <Trans>Synchronize Graphs</Trans>
                  </Button>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Card withBorder radius="lg">
              <Stack>
                <Title order={3}>
                  <Trans>Other Stuff</Trans>
                </Title>
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
                            <Text>
                              <Trans>Copy Referral Link</Trans>
                            </Text>
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
