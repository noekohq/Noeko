import { useParams } from "react-router";
import { ITask } from "../../../app/database/models/task";
import PageWrapper from "../../components/Layout/PageWrapper";
import useFetch from "../../hooks/useFetch";
import { useEffect } from "react";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import StatusBar from "../../components/UI/Layout/Bottom";
import Content from "../../components/UI/Layout/Content";
import { Group, Stack, Title } from "@mantine/core";
import { CheckIcon } from "@phosphor-icons/react";

export default function Task() {
  const { taskId } = useParams();

  const { data: task, load: loadTask } = useFetch<undefined, ITask>({
    url: `/tasks/${taskId}`,
    dependencies: [taskId],
  });

  useEffect(() => {
    loadTask();
  }, []);

  return (
    <PageWrapper>
      <LeftSidebar></LeftSidebar>
      <Content>
        <Stack>
          <Title>
            <Group>
              <CheckIcon weight="bold" />
              {task?.description}
            </Group>
          </Title>
        </Stack>
      </Content>
      <StatusBar></StatusBar>
      <RightSidebar></RightSidebar>
    </PageWrapper>
  );
}
