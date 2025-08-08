import { useEffect, useState } from "react";
import { ITask } from "../../../../app/database/models/task";
import useFetch from "../../../hooks/useFetch";
import { toYYYYMMDD } from "../../../utils/datetime";
import { IWidgetConfig } from "../index.d";
import TaskCard from "../../Display/Tasks/TaskCard";
import TaskButton from "../../Display/Tasks/TaskButton";
import { ActionIcon, Button, Group, Stack, Text } from "@mantine/core";
import styles from "./TaskList.module.scss";
import {
  ArrowRightIcon,
  CaretLeftIcon,
  CaretRightIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { useInteraction } from "../../../contexts/InteractionContext";
import { Link } from "react-router";
import ProgressBar from "../../Utils/Info/ProgressBar";
import { capitalize, formatDate } from "../../../utils/formatting";
import { getFormattedDate } from "@mantine/dates";

export default function TaskList() {
  const todayDate = toYYYYMMDD(new Date());
  const [date, setDate] = useState(todayDate);
  const { data: tasks, load: getTasks } = useFetch<undefined, ITask[]>({
    url: `/tasks/daily?date=${date}`,
    dependencies: [date],
  });

  const incrementDate = (by: number) => {
    const normalized = date.split("-").join("");
    const year = parseInt(normalized.substring(0, 4));
    const month = parseInt(normalized.substring(4, 6)) - 1;
    const day = parseInt(normalized.substring(6, 8));
    const currentDate = new Date(year, month, day);

    currentDate.setDate(currentDate.getDate() + by);

    setDate(toYYYYMMDD(currentDate));
  };

  useEffect(() => {
    getTasks();
  }, [date]);

  useEffect(() => {
    console.log("Tasks: ", tasks);
  }, [tasks]);

  const {
    actions: { newTask },
  } = useInteraction();

  const incompleteTasks: ITask[] =
    tasks?.filter((task) => !task.completedAt) ?? [];
  const completeTasks: ITask[] =
    tasks?.filter((task) => task.completedAt) ?? [];

  const progress = tasks?.length
    ? (completeTasks.length / tasks.length) * 100
    : 0;

  const formattedDate = () => {
    const normalized = date.split("-").join("");
    const year = parseInt(normalized.substring(0, 4));
    const month = parseInt(normalized.substring(4, 6)) - 1;
    const day = parseInt(normalized.substring(6, 8));
    const currentDate = new Date(year, month, day);
    return capitalize(formatDate(currentDate));
  };

  return (
    <div className={styles.taskList}>
      <Stack gap="xs">
        <Stack gap="xs" justify="flex-start" align="center">
          <Group gap="0" wrap="nowrap" justify="space-between" w="100%">
            <ActionIcon
              size="xs"
              variant="subtle"
              color="gray"
              onClick={() => {
                incrementDate(-1);
              }}
            >
              <CaretLeftIcon size={12} weight="bold" />
            </ActionIcon>
            <Text size="xs" c="dark.3" fw="bold">
              {formattedDate()}
            </Text>
            <ActionIcon
              size="xs"
              variant="subtle"
              color="gray"
              onClick={() => {
                incrementDate(1);
              }}
            >
              <CaretRightIcon size={12} weight="bold" />
            </ActionIcon>
          </Group>
          <Group gap="2px" justify="space-between" w="100%">
            <ActionIcon
              onClick={() => newTask()}
              size="xs"
              color="gray"
              variant="subtle"
            >
              <PlusIcon weight="bold" size={14} />
            </ActionIcon>
            <Link to="/tasks">
              <Button
                variant="subtle"
                c="dimmed"
                color="gray"
                p={0}
                rightSection={<ArrowRightIcon weight="bold" size={14} />}
                size="xs"
              >
                All
              </Button>
            </Link>
          </Group>
        </Stack>
        {!tasks?.length && (
          <Text size="sm" c="dimmed">
            <Group gap="xs">
              No tasks {formattedDate().toLocaleLowerCase()}.
            </Group>
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
                    getTasks();
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
                    getTasks();
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
