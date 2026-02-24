import { useEffect, useState, useRef } from "react";
import useFetch from "@core/hooks/useFetch";
import styles from "./Do.module.scss";
import {
  ITaskSortFields,
  IPublicTask,
  ITaskDurationBehavior,
} from "../../../../../../app/database/models/task";
import { Box, Group, Stack, Text, Loader, Center } from "@mantine/core";
import { useSearch } from "@domains/discovery/contexts/SearchContext";
import ConnectableThing from "@/components/Display/Interactions/Connections/ConnectableThing";
import {
  ClockClockwiseIcon,
  ClockCounterClockwiseIcon,
  ClockIcon,
  HourglassIcon,
  SunIcon,
} from "@phosphor-icons/react";
import { useNavigate } from "react-router";
import Selection from "@/components/Display/Interactions/Selection";
import TaskButton from "@domains/knowledge/components/Tasks/TaskButton";
import { SearchBar } from "@domains/discovery/components/Search/SearchBar";
import { toYYYYMMDD } from "@core/utils/datetime";
import { Duration } from "surrealdb";
import { deepEquals } from "bun";

type ITaskViews = "daily" | "urgent" | "recent";

export default function Do() {
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

  const hasSearch = searchQuery.length > 0;

  const firstTask = allTasks?.[0];
  const rest = firstTask ? allTasks?.slice(1, allTasks.length) : allTasks;

  return (
    <div className={styles.taskList}>
      <Group mb="md">
        <Selection
          initialValue={viewBy}
          options={[
            {
              label: "Today",
              value: "daily" as ITaskViews,
              icon: <SunIcon />,
            },
            {
              label: "Urgency",
              value: "urgent" as ITaskViews,
              icon: <HourglassIcon />,
            },
          ]}
          onSelect={(v) => {
            setViewBy(v as ITaskViews);
          }}
        />
        {viewBy === "daily" && (
          <Selection
            label="Time available"
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
        {hasSearch ? (
          <Stack gap="md">
            {searchResults?.map((s) => {
              return <ConnectableThing key={s.id.toString()} thing={s.value} />;
            })}
          </Stack>
        ) : (
          <Stack gap="sm">
            {firstTask && (
              <Box
                p="sm"
                style={{
                  border: "1px solid var(--mantine-color-dark-7)",
                  borderRadius: "var(--mantine-radius-lg)",
                }}
              >
                <Stack>
                  <Text size="sm" c="dimmed">
                    Jump Back In
                  </Text>
                  <TaskButton
                    task={firstTask}
                    onClick={() => {
                      navigate(`/task/${firstTask.id.toString()}`);
                    }}
                  />
                </Stack>
              </Box>
            )}
            {rest?.map((task) => {
              return <TaskButton key={task.id.toString()} task={task} />;
            })}
            {allTasks?.length === 0 && <Text size="sm">No tasks.</Text>}
            {loading && (
              <Group justify="center">
                <Loader size="sm" />
              </Group>
            )}
          </Stack>
        )}
      </div>
    </div>
  );
}
