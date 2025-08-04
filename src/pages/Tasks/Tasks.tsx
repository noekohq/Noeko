import { Flex, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { ITask } from "../../../app/database/models/task";
import PageWrapper from "../../components/Layout/PageWrapper";
import Content from "../../components/UI/Layout/Content";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import useFetch from "../../hooks/useFetch";
import TaskCard from "../../components/Display/Tasks/TaskCard";
import { CheckIcon, PlusIcon } from "@phosphor-icons/react";
import StatusBar from "../../components/UI/Layout/Bottom";
import { useEffect } from "react";
import CardButton from "../../components/Utils/Buttons/CardButton";
import { useInteraction } from "../../contexts/InteractionContext";

export default function Tasks() {
  const { data: tasks, load: getTasks } = useFetch<undefined, ITask[]>({
    url: "/tasks",
  });

  console.log("Tasks: ", tasks);

  useEffect(() => {
    getTasks();
  }, []);

  const {
    actions: { newTask },
  } = useInteraction();

  return (
    <PageWrapper>
      <LeftSidebar />
      <Content>
        <Stack>
          <Group>
            <Title>
              <Group>
                <CheckIcon />
                Your Tasks
              </Group>
            </Title>
          </Group>
          {!tasks?.length && (
            <Text c="dimmed" size="sm">
              No tasks, time to relax :)
            </Text>
          )}
          <SimpleGrid
            cols={{
              sm: 1,
              md: 2,
              lg: 3,
            }}
          >
            <CardButton
              onClick={() => {
                newTask();
              }}
            >
              <Flex justify="center" align="center" w="100%">
                <Text fw="bold" ta="center">
                  <Group gap="xs" align="center">
                    <PlusIcon weight="bold" />
                    Create
                  </Group>
                </Text>
              </Flex>
            </CardButton>
            {tasks?.length &&
              tasks.map((task) => {
                return (
                  <TaskCard
                    key={task.id.toString()}
                    task={task}
                    onMark={() => {
                      getTasks();
                    }}
                  />
                );
              })}
          </SimpleGrid>
        </Stack>
      </Content>
      <StatusBar />
      <RightSidebar />
    </PageWrapper>
  );
}
