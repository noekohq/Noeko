import PageWrapper from "../../../components/Layout/PageWrapper";
import Content from "../../../components/UI/Layout/Content";
import styles from "./Mobile.module.scss";
import Nav from "../../../components/UI/Layout/Nav";
import { Pillbar } from "../../../components/UI/Layout/Utils/Pillbar";
import { Grid, Stack, Text } from "@mantine/core";
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
import { useEffect, useState } from "react";
import usePins from "../../../hooks/usePins";
import ConnectableThing from "../../../components/Display/Interactions/Connections/ConnectableThing";

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
              <UnderConstruction />
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
  console.log("First pins : ", firstPins, pins);

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
