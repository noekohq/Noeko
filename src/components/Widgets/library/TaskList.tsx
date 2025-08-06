import { useEffect } from "react";
import { ITask } from "../../../../app/database/models/task";
import useFetch from "../../../hooks/useFetch";
import { toYYYYMMDD } from "../../../utils/datetime";
import { IWidgetConfig } from "../index.d";
import TaskCard from "../../Display/Tasks/TaskCard";
import TaskButton from "../../Display/Tasks/TaskButton";
import { ActionIcon, Button, Group, Stack, Text } from "@mantine/core";
import styles from "./TaskList.module.scss";
import { ArrowRightIcon, PlusIcon } from "@phosphor-icons/react";
import { useInteraction } from "../../../contexts/InteractionContext";
import { Link } from "react-router";
import ProgressBar from "../../Utils/Info/ProgressBar";

export default function TaskList() {
  const todayDate = toYYYYMMDD(new Date());
  const { data: tasks, load: getDailyTasks } = useFetch<undefined, ITask[]>({
    url: `/tasks/daily?date=${todayDate}`,
  });

  useEffect(() => {
    getDailyTasks();
  }, []);

  const {
    actions: { newTask },
  } = useInteraction();

  const incompleteTasks: ITask[] =
    tasks?.filter((task) => !task.completedAt) ?? [];
  const completeTasks: ITask[] =
    tasks?.filter((task) => task.completedAt) ?? [];

  const progress = tasks ? (completeTasks.length / tasks.length) * 100 : 0;

  return (
    <div className={styles.taskList}>
      <Stack gap="xs">
        <Text size="sm" fw="bold" c="dimmed">
          <Group gap="xs" justify="space-between">
            Today's Tasks
            <Group gap="2px">
              <ActionIcon
                onClick={() => newTask()}
                size="xs"
                color="dimmed"
                variant="subtle"
              >
                <PlusIcon weight="bold" size={14} />
              </ActionIcon>
              <Link to="/tasks">
                <Button
                  variant="subtle"
                  c="dimmed"
                  color="gray"
                  rightSection={<ArrowRightIcon weight="bold" size={14} />}
                  size="xs"
                >
                  All
                </Button>
              </Link>
            </Group>
          </Group>
        </Text>
        {!tasks?.length && (
          <Text size="sm" c="dimmed">
            <Group gap="xs">No tasks. </Group>
          </Text>
        )}
        <>
          {!!incompleteTasks?.length &&
            incompleteTasks?.map((task) => {
              return (
                <TaskButton
                  key={task.id.toString()}
                  task={task}
                  onMark={() => {
                    getDailyTasks();
                  }}
                />
              );
            })}
          {!!completeTasks?.length &&
            completeTasks?.map((task) => {
              return (
                <TaskButton
                  key={task.id.toString()}
                  task={task}
                  onMark={() => {
                    getDailyTasks();
                  }}
                />
              );
            })}
        </>
      </Stack>
      <div className={styles.progress}>
        <ProgressBar progress={progress} />
      </div>
    </div>
  );
}

export const config: IWidgetConfig = {
  columns: {
    default: 4,
    min: 4,
    max: 6,
  },
};
