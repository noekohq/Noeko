import PageWrapper from "../../../components/Layout/PageWrapper";
import Content from "../../../components/UI/Layout/Content";
import styles from "./Mobile.module.scss";
import Nav from "../../../components/UI/Layout/Nav";
import { Pillbar } from "../../../components/UI/Layout/Utils/Pillbar";
import {
  Avatar,
  Box,
  Card,
  Grid,
  Group,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import PaperCard from "../../../components/Display/Paper/PaperCard";
import {
  CheckIcon,
  ClockCounterClockwiseIcon,
  PushPinIcon,
} from "@phosphor-icons/react";
import useFetch from "../../../hooks/useFetch";
import { ITask } from "../../../../app/database/models/task";
import TaskButton from "../../../components/Display/Tasks/TaskButton";
import { ISafeIdea } from "../../../../app/database/models/ideas";
import PaperButton from "../../../components/Display/Paper/PaperButton";
import { Link, useNavigate } from "react-router";
import IdeaButton from "../../../components/Display/Ideas/Interactions/IdeaButton";
import TopBar from "../../../components/UI/Layout/TopBar";
import UnderConstruction from "../../../components/Utils/UnderConstruction";
import { useEffect, useMemo, useState } from "react";
import usePins from "../../../hooks/usePins";
import ConnectableThing from "../../../components/Display/Interactions/Connections/ConnectableThing";
import { ISharedThing } from "../../../../app/database/models/share";
import { IPublicUser, ISafeUser } from "../../../../app/database/models/user";
import { userInitials } from "../../../utils/user";
import { formatDateTime } from "../../../utils/formatting";

export default function MobileDashboard() {
  const [currentTab, setCurrentTab] = useState("overview");

  return (
    <PageWrapper>
      <TopBar />
      <Content>
        <div className={styles.dashboard}>
          <Pillbar defaultValue={currentTab} onChange={setCurrentTab}>
            <Pillbar.List>
              <Pillbar.Tab value="overview">Overview</Pillbar.Tab>
              <Pillbar.Tab value="agenda">Agenda</Pillbar.Tab>
              <Pillbar.Tab value="insights">Insights</Pillbar.Tab>
              <Pillbar.Tab value="shared">Shared</Pillbar.Tab>
            </Pillbar.List>
            <Pillbar.Panel value="overview">
              <Overview setTab={setCurrentTab} />
            </Pillbar.Panel>
            <Pillbar.Panel value="agenda">
              <UnderConstruction />
            </Pillbar.Panel>
            <Pillbar.Panel value="insights">
              <UnderConstruction />
            </Pillbar.Panel>
            <Pillbar.Panel value="shared">
              <Shared setTab={setCurrentTab} />
            </Pillbar.Panel>
          </Pillbar>
        </div>
      </Content>
      <Nav />
    </PageWrapper>
  );
}

interface IOverviewProps {
  setTab: (tab: string) => void;
}

function Overview({ setTab }: IOverviewProps) {
  const { load: loadTasks, data: tasks } = useFetch<undefined, ITask[]>({
    url: "/tasks",
    query: {
      limit: "3",
      start: "0",
    },
    runOnMount: true,
  });

  const { load: loadRecentIdea, data: recentIdeas } = useFetch<
    undefined,
    ISafeIdea[]
  >({
    url: "/ideas",
    query: {
      limit: "3",
      start: "0",
      sortField: "updatedAt",
      sortOrder: "desc",
    },
    runOnMount: true,
  });
  const recentIdea = recentIdeas?.[0];

  const navigate = useNavigate();

  const { pins } = usePins();
  const firstPins = pins.slice(0, 3);

  return (
    <div className={styles.overview}>
      <Grid>
        <Grid.Col span={12}>
          <UnderConstruction />
        </Grid.Col>
        {tasks && tasks.length > 0 && (
          <Grid.Col span={12}>
            <PaperCard
              icon={CheckIcon}
              title="ACTIVE TASKS"
              onClick={() => {
                setTab("agenda");
              }}
            >
              <Stack gap="xs">
                {tasks?.map((t) => {
                  return (
                    <TaskButton
                      task={t}
                      key={t.id.toString()}
                      detail="simple"
                    />
                  );
                })}
              </Stack>
            </PaperCard>
          </Grid.Col>
        )}
        <Grid.Col span={12}>
          <PaperCard title="PINNED" icon={PushPinIcon}>
            {firstPins.length < 1 && (
              <Text c="gray" size="sm">
                Nothing yet pinned.
              </Text>
            )}
            {firstPins.length > 0 && (
              <Stack gap="xs">
                {firstPins.map((p) => {
                  return (
                    <ConnectableThing link key={p.id.toString()} thing={p} />
                  );
                })}
              </Stack>
            )}
          </PaperCard>
        </Grid.Col>
        {recentIdea && (
          <Grid.Col span={12}>
            <Link
              to={`/idea/${recentIdea.id.toString()}`}
              style={{
                textDecoration: "none",
              }}
            >
              <PaperButton
                leftSection={<ClockCounterClockwiseIcon weight="bold" />}
                fullWidth
              >
                {recentIdea.title}
              </PaperButton>
            </Link>
          </Grid.Col>
        )}
      </Grid>
    </div>
  );
}

function Shared({ setTab }: IOverviewProps) {
  const { load: loadShared, data: sharedThings } = useFetch<
    undefined,
    ISharedThing[]
  >({
    url: "/sharing",
  });

  useEffect(() => {
    loadShared();
  }, []);

  const groupedByOwner = useMemo(() => {
    if (!sharedThings) return [];

    const grouped = sharedThings.reduce(
      (acc, curr) => {
        acc[curr.owner.id] = [...(acc[curr.owner.id] || []), curr];
        return acc;
      },
      {} as Record<string, ISharedThing[]>,
    );

    return Object.values(grouped).map((items) => {
      const owner = items[0].owner;
      const lastActivity = items.reduce((latest, item) => {
        const itemDate = new Date(item.updatedAt);
        return itemDate > latest ? itemDate : latest;
      }, new Date(0));

      return {
        owner,
        lastActivity,
        items,
      };
    });
  }, [sharedThings]);

  const sortedGroups = useMemo(() => {
    return groupedByOwner.sort(
      (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime(),
    );
  }, [groupedByOwner]);

  if (!sharedThings || sharedThings.length === 0) {
    return <Text>Nothing has been shared with you yet.</Text>;
  }

  return (
    <div>
      <Stack gap="lg">
        {!sortedGroups.length && <Text size="sm">No shared items found.</Text>}
        {sortedGroups.map((group) => (
          <Card radius="lg">
            <Stack>
              <Group key={group.owner.id} gap="xs" align="center">
                <Avatar
                  variant="filled"
                  src={userInitials(group.owner)}
                  size={20}
                />
                <Text size="sm">
                  {group.owner.firstName} {group.owner.lastName}
                </Text>
                <Text c="dimmed" size="sm">
                  {formatDateTime(group.lastActivity)}
                </Text>
              </Group>
              <SimpleGrid
                cols={{
                  sm: 1,
                  md: 2,
                  lg: 3,
                }}
              >
                {group.items.map((item) => (
                  <ConnectableThing
                    key={item.id.toString()}
                    thing={item}
                    link
                  />
                ))}
              </SimpleGrid>
            </Stack>
          </Card>
        ))}
      </Stack>
    </div>
  );
}
