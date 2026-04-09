import { useEffect } from "react";
import { Stack, Title, Paper, Text, Loader, Group, ActionIcon } from "@mantine/core";
import { Trans } from "@lingui/react/macro";

import { IPublicTask, ITaskSortFields } from "../../../../../app/database/models/task";
import useFetch from "@core/hooks/useFetch";
import styles from "./Tasks.module.scss";
import PageWrapper from "@core/design/layout/PageWrapper";
import LeftSidebar from "@core/design/components/Layout/Left";
import RightSidebar from "@core/design/components/Layout/Right";
import Content from "@core/design/components/Layout/Content";
import { useInteraction } from "@/contexts/InteractionContext";
import { PlusIcon } from "@phosphor-icons/react";
import TaskButton from "@domains/knowledge/components/Tasks/TaskButton";
import Nav from "@core/design/components/Layout/Nav";
import TopBar from "@core/design/components/Layout/TopBar";
import { useSearch } from "@domains/discovery/contexts/SearchContext";

const tasksQuery = {
  sortField: "updatedAt" as ITaskSortFields,
  sortDirection: "desc" as "asc" | "desc",
};

export default function TasksPage() {
  const {
    data: allTasks,
    loading,
    load: loadTasks,
  } = useFetch<undefined, IPublicTask[]>({
    url: "/tasks",
    query: tasksQuery,
  });

  const {
    global: {
      query: { get: searchQuery },
    },
  } = useSearch();

  useEffect(() => {
    if (!searchQuery) {
      loadTasks();
    }
  }, [searchQuery]);

  const {
    actions: { newTask },
  } = useInteraction();

  return (
    <PageWrapper>
      <TopBar />
      <LeftSidebar></LeftSidebar>
      <Content>
        <div className={styles.tasks}>
          <Stack gap="xl">
            <Group justify="space-between">
              <Title order={1}>
                <Group gap="lg">
                  <Trans>Your Quests</Trans>
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

            {loading && (
              <Group justify="center">
                <Loader />
              </Group>
            )}

            {!loading && allTasks?.length === 0 && (
              <Text size="sm" c="dimmed">
                <Trans>No open quests.</Trans>
              </Text>
            )}

            {!loading && allTasks && allTasks.length > 0 && (
              <Stack>
                {allTasks.map((task) => (
                  <TaskButton key={task.id.toString()} task={task} />
                ))}
              </Stack>
            )}
          </Stack>
        </div>
      </Content>
      <Nav />
      <RightSidebar></RightSidebar>
    </PageWrapper>
  );
}
