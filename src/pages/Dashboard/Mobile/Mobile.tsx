import PageWrapper from "../../../components/Layout/PageWrapper";
import Content from "../../../components/UI/Layout/Content";
import styles from "./Mobile.module.scss";
import Nav from "../../../components/UI/Layout/Nav";
import { Pillbar } from "../../../components/UI/Layout/Utils/Pillbar";
import { Grid, Group, Stack } from "@mantine/core";
import PaperCard from "../../../components/Display/Paper/PaperCard";
import {
  CalendarCheckIcon,
  ClockCounterClockwiseIcon,
} from "@phosphor-icons/react";
import useFetch from "../../../hooks/useFetch";
import { ITask } from "../../../../app/database/models/task";
import TaskButton from "../../../components/Display/Tasks/TaskButton";
import { ISafeIdea } from "../../../../app/database/models/ideas";
import PaperButton from "../../../components/Display/Paper/PaperButton";
import { Link } from "react-router";
import IdeaButton from "../../../components/Display/Ideas/Interactions/IdeaButton";
import TopBar from "../../../components/UI/Layout/TopBar";

export default function MobileDashboard() {
  return (
    <PageWrapper>
      <TopBar />
      <Content>
        <div className={styles.dashboard}>
          <Pillbar defaultValue="overview">
            <Pillbar.List>
              <Pillbar.Tab value="overview">Overview</Pillbar.Tab>
              <Pillbar.Tab value="agenda">Agenda</Pillbar.Tab>
              <Pillbar.Tab value="insights">Insights</Pillbar.Tab>
              <Pillbar.Tab value="shared">Shared</Pillbar.Tab>
            </Pillbar.List>
            <Pillbar.Panel value="overview">
              <Overview />
            </Pillbar.Panel>
            <Pillbar.Panel value="agenda">Agenda page</Pillbar.Panel>
            <Pillbar.Panel value="insights">Insights page</Pillbar.Panel>
            <Pillbar.Panel value="shared">Shared page</Pillbar.Panel>
          </Pillbar>
        </div>
      </Content>
      <Nav />
    </PageWrapper>
  );
}

function Overview() {
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

  return (
    <div className={styles.overview}>
      <Grid>
        {tasks && tasks.length > 0 && (
          <Grid.Col span={12}>
            <PaperCard title="ACTIVE TASKS">
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
        {recentIdeas && (
          <Grid.Col span={12}>
            <PaperCard title="RECENT IDEAS">
              <Stack gap="xs">
                {recentIdeas?.map((i) => {
                  return <IdeaButton idea={i} key={i.id.toString()} />;
                })}
              </Stack>
            </PaperCard>
          </Grid.Col>
        )}
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
