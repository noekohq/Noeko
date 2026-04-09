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
import PageWrapper from "@core/design/layout/PageWrapper";
import LeftSidebar from "@core/design/components/Layout/Left";
import RightSidebar from "@core/design/components/Layout/Right";
import { useAuth } from "@domains/identity/contexts/AuthContext";
import { getCurrentTimeOfDay } from "@core/utils/datetime";
import useFetch from "@core/hooks/useFetch";
import { IIdea, IUserIdeaStats } from "../../../../../shared/types/idea";
import { useLayout } from "@/contexts/LayoutContext";
import { CompactIdeaCard, StandardIdeaCard } from "@domains/knowledge/components/Ideas/IdeaCards";
import { getOS } from "@core/utils/platform";
import Search from "@domains/discovery/components/Search/Search";
import { useMediaQuery } from "@mantine/hooks";
import {
  ArrowRight,
  HandWaving,
  MagnifyingGlassIcon,
  NotePencilIcon,
  Plus,
  PlusIcon,
  Scroll,
} from "@phosphor-icons/react";
import { handleCreateNewIdea } from "@domains/knowledge/utils/ideas";
import { Link, useNavigate } from "react-router";
import { showNotification } from "@mantine/notifications";
import { useState } from "react";
import { userIsSuperuser } from "@domains/identity/utils/user";
import { useInteraction } from "@/contexts/InteractionContext";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/core/macro";
import { Trans, Plural } from "@lingui/react/macro";
import Content from "@core/design/components/Layout/Content";
import TopBar from "@core/design/components/Layout/TopBar";

export default function Dashboard() {
  const { i18n } = useLingui();
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
  } = useLayout();

  const isMac = os === "macos";
  const primaryKey = isMac ? "Cmd" : "Ctrl";

  const totalIdeas = dashboardData?.ideaStats.total;
  const totalUsers = dashboardData?.totalUsers;

  const timeOfDay = {
    morning: i18n._(t`morning`),
    afternoon: i18n._(t`afternoon`),
    evening: i18n._(t`evening`),
  }[getCurrentTimeOfDay()];

  const getStatusText = () => {
    if (totalIdeas === undefined) {
      return <Trans>Loading...</Trans>;
    }
    return (
      <>
        <Trans>Hello there!</Trans>
        {totalUsers && (
          <>
            {" "}
            <Trans>You are using Noeko with {totalUsers - 1} other people.</Trans>
          </>
        )}
        {totalIdeas && totalIdeas > 0 && (
          <>
            {" "}
            <Trans>
              You have <Plural value={totalIdeas} one="# idea" other="# ideas" />!
            </Trans>
          </>
        )}
      </>
    );
  };

  const navigate = useNavigate();

  const [loadingNewIdea, setLoadingNewIdea] = useState(false);

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
      <TopBar />
      <LeftSidebar>
        <LeftSidebar.Open>
          <Text c="dimmed" size="sm">
            {getStatusText()}
          </Text>
          <Space my="lg" />
          <Group align="baseline" gap="sm">
            <Title order={3}>
              <Trans>Recent Ideas</Trans>
            </Title>
            <Link
              to="/ideas"
              style={{
                textDecoration: "none",
              }}
            >
              <Text c="dimmed" size="xs" fw="bold">
                <Trans>VIEW ALL</Trans>
              </Text>
            </Link>
          </Group>
          <Space my="sm" />
          {!dashboardData?.recentIdeas?.length && (
            <>
              <Text size="sm" c="gray" mb="md">
                <Trans>You have no ideas yet!</Trans>
              </Text>
              <Button variant="light">
                <Trans>Add an idea!</Trans>
              </Button>
            </>
          )}
          <Stack gap="xs">
            {dashboardData?.recentIdeas &&
              dashboardData.recentIdeas.map((idea) => {
                return <CompactIdeaCard idea={idea} key={idea.id.toString()} link />;
              })}
          </Stack>
        </LeftSidebar.Open>
      </LeftSidebar>
      <Content>
        <Grid>
          <Grid.Col span={{ sm: 12 }}>
            <Group mb="sm">
              <HandWaving weight="bold" size="36px" />
              <Title>
                <Trans>
                  Good {timeOfDay}, {user?.firstName}
                </Trans>
              </Title>
            </Group>
            <Group>
              <Text size="sm" c="dimmed">
                <Trans>
                  Poke around, have fun, enjoy your time and don't be afraid to give us feedback!
                </Trans>
              </Text>
            </Group>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }} />
          <Grid.Col>
            {!isMobile && (
              <Card radius="lg">
                <Flex wrap="wrap" direction="column" align="center" gap="md">
                  <Button
                    variant="light"
                    onClick={() => {
                      newIdea();
                    }}
                  >
                    <Group>
                      <NotePencilIcon weight="bold" />
                      <Text>
                        <Trans>Add Idea</Trans>
                      </Text>
                      <Kbd>{primaryKey} + I</Kbd>
                    </Group>
                  </Button>
                  <Link to="/updates">
                    <Button variant="default">
                      <Group>
                        <Scroll />
                        <Text>
                          <Trans>See latest updates</Trans>
                        </Text>
                      </Group>
                    </Button>
                  </Link>
                  <Button variant="default">
                    <Group>
                      <Text>
                        <Trans>Dashboard view</Trans>
                      </Text>
                      <Kbd>{primaryKey} + H</Kbd>
                    </Group>
                  </Button>
                  <Link to="/ideas">
                    <Button variant="default">
                      <Group>
                        <Text>
                          <Trans>All ideas</Trans>
                        </Text>
                        <Kbd>{primaryKey} + B</Kbd>
                      </Group>
                    </Button>
                  </Link>
                  <Link to="/graph">
                    <Button variant="default">
                      <Group>
                        <Text>
                          <Trans>Constellation</Trans>
                        </Text>
                        <Kbd>{primaryKey} + G</Kbd>
                      </Group>
                    </Button>
                  </Link>
                  <Link to="/spyglass">
                    <Button variant="default">
                      <Group>
                        <Text>
                          <Trans>Spyglass</Trans>
                        </Text>
                        <Kbd>{primaryKey} + Shift + /</Kbd>
                      </Group>
                    </Button>
                  </Link>
                  <Link to="/settings">
                    <Button variant="default">
                      <Group>
                        <Text>
                          <Trans>Settings</Trans>
                        </Text>
                        <Kbd>{primaryKey} + .</Kbd>
                      </Group>
                    </Button>
                  </Link>
                  {isSuperuser && (
                    <Link to="/admin">
                      <Button variant="default">
                        <Group>
                          <Text>
                            <Trans>Admin Panel</Trans>
                          </Text>
                          <Kbd>{primaryKey} + ;</Kbd>
                        </Group>
                      </Button>
                    </Link>
                  )}
                  <Link to="/ideas/shared">
                    <Button variant="default">
                      <Group>
                        <Text>
                          <Trans>Shared ideas</Trans>
                        </Text>
                      </Group>
                    </Button>
                  </Link>
                  <Link to="/rabbitholes">
                    <Button variant="default">
                      <Group>
                        <Text>
                          <Trans>Rabbitholes</Trans>
                        </Text>
                      </Group>
                    </Button>
                  </Link>
                  <Link to="/tags">
                    <Button variant="default">
                      <Group>
                        <Text>
                          <Trans>Manage Tags</Trans>
                        </Text>
                      </Group>
                    </Button>
                  </Link>
                </Flex>
              </Card>
            )}
            {isMobile && (
              <>
                <Group justify="center">
                  <Button
                    variant="light"
                    rightSection={<PlusIcon weight="bold" />}
                    onClick={() => {
                      newIdea();
                    }}
                    fullWidth
                  >
                    <Trans>Idea</Trans>
                  </Button>
                </Group>
                <Space my="md" />
                <Text c="dimmed" size="sm">
                  {getStatusText()}
                </Text>
                <Space my="md" />
                <Search />
                <Space my="md" />
                <Grid grow>
                  <Grid.Col span={{ sm: 12 }}>
                    <Group align="baseline" gap="sm">
                      <Title order={3}>
                        <Trans>Recent Ideas</Trans>
                      </Title>
                      <Link
                        to="/ideas"
                        style={{
                          textDecoration: "none",
                        }}
                      >
                        <Text c="dimmed" size="xs" fw="bold">
                          <Trans>VIEW ALL</Trans> <ArrowRight />
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
