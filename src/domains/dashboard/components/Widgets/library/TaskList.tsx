import { useEffect, useState } from "react";
import {
  IPublicTask,
  ITask,
  ITaskDurationBehavior,
  ITaskSortFields,
} from "../../../../../../app/database/models/task";
import useFetch from "@core/hooks/useFetch";
import { toYYYYMMDD } from "@core/utils/datetime";
import { IWidgetConfig } from "../index.d";
import TaskButton from "@domains/knowledge/components/Tasks/TaskButton";
import { ActionIcon, Group, Loader, Stack, Text } from "@mantine/core";
import styles from "./TaskList.module.scss";
import { CaretLeftIcon, CaretRightIcon, PlusIcon } from "@phosphor-icons/react";
import { useInteraction } from "@/contexts/InteractionContext";
import { Link, useNavigate } from "react-router";
import ProgressBar from "@core/design/components/Utils/ProgressBar";
import { capitalize, formatDate } from "@core/utils/formatting";
import { useLayout } from "@/contexts/LayoutContext";
import Selection from "@core/design/components/Display/Interactions/Selection";
import { useSearch } from "@domains/discovery/contexts/SearchContext";
import { useTourStep } from "@/contexts/TourGuideContext";

type ITaskViews = "daily" | "urgent" | "recent";

export default function TaskList() {
  const [viewBy, setViewBy] = useState<ITaskViews>("daily");
  const [timeAvailable, setTimeAvailable] = useState<string>();

  const navigate = useNavigate();
  const todayDate = toYYYYMMDD(new Date());
  const tomorrowDate = toYYYYMMDD(new Date(Date.now() + 24 * 60 * 60 * 1000));

  const getQuery = () => {
    const query: {
      sortField?: ITaskSortFields;
      sortDirection?: "asc" | "desc";
      duration?: string;
      durationBehavior?: ITaskDurationBehavior;
      dateStart?: string;
      dateEnd?: string;
    } = {
      sortField: undefined,
      sortDirection: "desc",
      duration: undefined,
      durationBehavior: "under-inclusive",
      dateStart: undefined,
      dateEnd: undefined,
    };

    switch (viewBy) {
      case "daily": {
        query.dateStart = todayDate;
        query.dateEnd = tomorrowDate;
        query.sortField = "updatedAt";
        query.sortDirection = "asc";
        break;
      }
      case "urgent": {
        query.sortField = "dueDate";
        query.sortDirection = "asc";
        break;
      }
      case "recent": {
        query.sortField = "updatedAt";
        query.sortDirection = "desc";
        break;
      }
    }

    if (timeAvailable) {
      query.duration = timeAvailable;
    }

    return query;
  };

  const {
    data: allTasks,
    loading,
    load: loadTasks,
  } = useFetch<undefined, IPublicTask[]>({
    url: "/tasks",
    query: {
      ...getQuery(),
    },
    dependencies: [getQuery()],
  });

  useEffect(() => {
    setTimeAvailable(undefined);
  }, [viewBy]);

  const {
    global: {
      query: { get: searchQuery },
      results: { get: searchResults },
    },
  } = useSearch();

  useEffect(() => {
    loadTasks();
  }, [viewBy, timeAvailable]);

  useEffect(() => {
    if (!searchQuery && !loading) {
      loadTasks();
    }
  }, [searchQuery]);

  const {
    actions: { newTask },
  } = useInteraction();

  const taskListRef = useTourStep({
    id: "feature:widget_task_list",
    title: "Your todo list",
    content:
      "Manage your quests here. Your quests will surface as relevant context to remind you to do things when they're relevant.",
    view: "dashboard",
    order: 2,
  });

  return (
    <div className={styles.taskList} ref={taskListRef}>
      <Group wrap="nowrap" gap="xs">
        <Selection
          initialValue={viewBy}
          options={[
            {
              label: "Today",
              value: "daily" as ITaskViews,
            },
            {
              label: "Urgency",
              value: "urgent" as ITaskViews,
            },
          ]}
          onSelect={(v) => {
            setViewBy(v as ITaskViews);
          }}
        />
        {viewBy === "daily" && (
          <Selection
            label="Time"
            initialValue={timeAvailable}
            options={[
              {
                label: "8h",
                value: "8h",
              },
              {
                label: "4h",
                value: "4h",
              },
              {
                label: "1h",
                value: "1h",
              },
              {
                label: "30m",
                value: "30m",
              },
              {
                label: "15m",
                value: "15m",
              },
            ]}
            onSelect={(v) => {
              setTimeAvailable(v);
            }}
          />
        )}
      </Group>
      <div className={styles.scrollArea}>
        <Stack gap="xs">
          {allTasks?.map((task) => {
            return <TaskButton key={task.id.toString()} task={task} />;
          })}
          {allTasks?.length === 0 && (
            <Text size="sm" c="dimmed">
              No tasks.
            </Text>
          )}
          {loading && (
            <Group justify="center">
              <Loader size="sm" />
            </Group>
          )}
        </Stack>
      </div>
      <div className={styles.ui}>
        <Group justify="right">
          <ActionIcon
            onClick={() => {
              newTask();
            }}
            variant="filled"
            color="gray"
            radius="lg"
            size="md"
          >
            <PlusIcon size={14} weight="bold" />
          </ActionIcon>
        </Group>
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

function DailyTasks() {
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

  const {
    actions: { newTask },
  } = useInteraction();

  const incompleteTasks: ITask[] = tasks?.filter((task) => !task.completedAt) ?? [];
  const completeTasks: ITask[] = tasks?.filter((task) => task.completedAt) ?? [];

  const progress = tasks?.length ? (completeTasks.length / tasks.length) * 100 : 0;

  const { isMobile } = useLayout();

  const formattedDate = () => {
    const normalized = date.split("-").join("");
    const year = parseInt(normalized.substring(0, 4));
    const month = parseInt(normalized.substring(4, 6)) - 1;
    const day = parseInt(normalized.substring(6, 8));
    const currentDate = new Date(year, month, day);
    return capitalize(formatDate(currentDate));
  };

  return (
    <div className={styles.daily}>
      <Stack gap="xs">
        <Stack gap="xs" justify="flex-start" align="center">
          <Group gap="0" wrap="nowrap" justify="space-between" w="100%">
            <ActionIcon
              size={isMobile ? "md" : "xs"}
              variant="light"
              color="gray"
              onClick={() => {
                incrementDate(-1);
              }}
            >
              <CaretLeftIcon size={isMobile ? 16 : 12} weight="bold" />
            </ActionIcon>
            <Text size={isMobile ? "md" : "sm"} c="dark.2" fw="bold">
              {formattedDate()}
            </Text>
            <Group gap="xs">
              <ActionIcon
                size={isMobile ? "md" : "xs"}
                variant="light"
                color="gray"
                onClick={() => {
                  incrementDate(1);
                }}
              >
                <CaretRightIcon size={isMobile ? 16 : 12} weight="bold" />
              </ActionIcon>
            </Group>
          </Group>
        </Stack>
        {!tasks?.length && (
          <Text size="sm" c="dimmed" ta="center">
            No quests {formattedDate().toLocaleLowerCase()}.
          </Text>
        )}
        {!!tasks && tasks.length > 0 && (
          <div className={styles.progress}>
            <ProgressBar progress={progress} />
          </div>
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
    </div>
  );
}
