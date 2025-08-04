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

  return (
    <div className={styles.taskList}>
      <Stack gap="xs">
        <Text size="sm" fw="bold" c="dimmed">
          <Group gap="xs">
            Today's Tasks
            <Button
              leftSection={<PlusIcon weight="bold" />}
              onClick={newTask}
              size="xs"
              color="gray"
              variant="subtle"
            >
              New
            </Button>
            <Link to="/tasks">
              <Button
                variant="subtle"
                color="gray"
                rightSection={<ArrowRightIcon />}
                size="xs"
              >
                All
              </Button>
            </Link>
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
    </div>
  );
}

export const config: IWidgetConfig = {
  columns: {
    default: 6,
    min: 4,
    max: 6,
  },
};
