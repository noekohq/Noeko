import React, { useState, useEffect, useMemo } from "react";
import {
  Stack,
  Title,
  Paper,
  Text,
  Loader,
  Group,
  Switch,
  ActionIcon,
} from "@mantine/core";
import { useInView } from "react-intersection-observer";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";

import { ITask } from "../../../app/database/models/task";
import TaskCard from "../../components/Display/Tasks/TaskCard";
import { api } from "../../server/api";
import styles from "./Tasks.module.scss";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import StatusBar from "../../components/UI/Layout/Bottom";
import Content from "../../components/UI/Layout/Content";
import { useInteraction } from "../../contexts/InteractionContext";
import { PlusIcon } from "@phosphor-icons/react";
import TaskButton from "../../components/Display/Tasks/TaskButton";

dayjs.extend(weekOfYear);

type TasksByDay = Map<string, ITask[]>;

const processTasks = (tasks: ITask[]) => {
  const dated: ITask[] = [];
  const undated: ITask[] = [];

  for (const task of tasks) {
    if (task.dueDate) {
      dated.push(task);
    } else {
      undated.push(task);
    }
  }

  const grouped = new Map<string, ITask[]>();
  dated.forEach((task) => {
    const taskDate = dayjs(task.dueDate!).format("YYYY-MM-DD");
    if (!grouped.has(taskDate)) {
      grouped.set(taskDate, []);
    }
    grouped.get(taskDate)!.push(task);
  });

  return { grouped, undated };
};

export default function TaskTimelineView() {
  const [allTasks, setAllTasks] = useState<ITask[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [fetchMonth, setFetchMonth] = useState(dayjs().startOf("month"));

  useEffect(() => {
    if (!hasMore || loading) return;

    const getTasksForMonth = async () => {
      try {
        setLoading(true);
        const startDate = fetchMonth.format("YYYY-MM-DD");
        const endDate = fetchMonth.endOf("month").format("YYYY-MM-DD");

        const url = `/tasks/range?startDate=${startDate}&endDate=${endDate}`;
        const response = await api.get(url);
        const data = response.data.data as ITask[];

        if (data.length === 0) {
          setHasMore(false);
        } else {
          setAllTasks((prevTasks) => [...prevTasks, ...data]);
        }
      } catch (error) {
        console.error("Error getting tasks:", error);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    };

    getTasksForMonth();
  }, [fetchMonth, hasMore]);

  const { tasksByDay, undated: undatedTasks } = useMemo(() => {
    const tasksToProcess = showCompleted
      ? allTasks
      : allTasks.filter((task) => !task.completedAt);

    const { grouped, undated } = processTasks(tasksToProcess);

    const sortedGrouped = new Map(
      [...grouped.entries()].sort(
        (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime(),
      ),
    );

    return { tasksByDay: sortedGrouped, undated };
  }, [allTasks, showCompleted]);

  const { ref, inView } = useInView({ threshold: 0 });

  useEffect(() => {
    if (inView && !loading && hasMore) {
      setFetchMonth((prevMonth) => prevMonth.add(1, "month"));
    }
  }, [inView, loading, hasMore]);

  let lastRenderedWeek = "";
  let lastRenderedMonth = "";
  let lastRenderedYear = "";

  const {
    actions: { newTask },
  } = useInteraction();

  return (
    <PageWrapper>
      <LeftSidebar></LeftSidebar>
      <Content>
        <div className={styles.tasks}>
          <Stack gap="xl">
            <Group justify="space-between">
              <Title order={1}>
                <Group gap="lg">
                  Your Agenda
                  <ActionIcon
                    variant="light"
                    color="gray"
                    onClick={() => {
                      newTask();
                    }}
                  >
                    <PlusIcon weight="bold" />
                  </ActionIcon>
                </Group>
              </Title>
            </Group>

            {undatedTasks.length > 0 && (
              <Paper withBorder shadow="xs" p="md">
                <Title order={4}>Unscheduled</Title>
                <Text size="sm" c="dimmed">
                  Tasks with no due date.
                </Text>
                <Stack mt="sm">
                  {undatedTasks.map((task) => (
                    <TaskButton key={task.id.toString()} task={task} />
                  ))}
                </Stack>
              </Paper>
            )}

            {!Array.from(tasksByDay.entries()).length && (
              <Text size="sm" c="dimmed">
                No tasks on your agenda.
              </Text>
            )}
            {Array.from(tasksByDay.entries()).map(([dateString, tasks]) => {
              const date = dayjs(dateString);
              const currentYear = date.format("YYYY");
              const currentMonth = date.format("MMMM");
              const currentWeek = `Week ${date.week()}`;

              const showYearHeader = currentYear !== lastRenderedYear;
              const showMonthHeader = currentMonth !== lastRenderedMonth;
              const showWeekHeader = currentWeek !== lastRenderedWeek;

              if (showYearHeader) lastRenderedYear = currentYear;
              if (showMonthHeader) lastRenderedMonth = currentMonth;
              if (showWeekHeader) lastRenderedWeek = currentWeek;

              return (
                <React.Fragment key={dateString}>
                  {showYearHeader && (
                    <Title
                      order={2}
                      style={{
                        position: "sticky",
                        top: 0,
                        background: "var(--mantine-color-body)",
                        zIndex: 1,
                      }}
                    >
                      {currentYear}
                    </Title>
                  )}
                  {showMonthHeader && <Title order={3}>{currentMonth}</Title>}
                  {/*{showWeekHeader && (
                    <Title order={5} c="dimmed">
                      {currentWeek}
                    </Title>
                  )}*/}
                  <Paper withBorder shadow="none" p="md" radius="md">
                    <Text fw={700}>{date.format("dddd, MMMM D")}</Text>
                    <Stack mt="sm">
                      {tasks.map((task) => (
                        <TaskButton key={task.id.toString()} task={task} />
                      ))}
                    </Stack>
                  </Paper>
                </React.Fragment>
              );
            })}

            <div ref={ref} style={{ height: "50px", marginTop: "24px" }}>
              {loading && hasMore && (
                <Loader style={{ margin: "auto" }} color="gray" size="sm" />
              )}
            </div>
          </Stack>
        </div>
      </Content>
      <StatusBar></StatusBar>
      <RightSidebar></RightSidebar>
    </PageWrapper>
  );
}
