import { Button, Group, Stack, Text, Title } from "@mantine/core";
import PageWrapper from "../../Layout/PageWrapper";
import Content from "../Layout/Content";
import { IOnboardingProps } from "./Index";
import { Link, useNavigate } from "react-router";
import useFetch from "../../../hooks/useFetch";
import { ISafeIdea } from "../../../../app/database/models/ideas";
import { showNotification } from "@mantine/notifications";

export default function ChooseYourPath({ next, complete }: IOnboardingProps) {
  const navigate = useNavigate();

  const { load: firstIdea } = useFetch<undefined, ISafeIdea>({
    url: "/ideas/first",
    method: "POST",
    onSuccess: async (i) => {
      await complete();
      navigate(`/idea/${i.id.toString()}`);
    },
    onError: (error) => {
      console.error("Error creating user's first idea: ", error);
      showNotification({
        title: "Error creating idea!",
        message: "Please try again later.",
      });
    },
  });

  const importPath = async () => {
    await complete();
    navigate(`/import`);
  };

  const firstIdeaPath = async () => {
    await complete();
    firstIdea();
  };

  return (
    <PageWrapper>
      <Content>
        <Stack align="center">
          <Title>Choose your path</Title>
          <Text size="md" ta="center">
            Let's begin. Would you like to import existing notes or start fresh
            with your first idea?
          </Text>
          <Group justify="center">
            <Button
              variant="filled"
              radius="md"
              onClick={() => {
                firstIdeaPath();
              }}
            >
              Create my first idea!
            </Button>
            <Button
              variant="outline"
              radius="md"
              onClick={() => {
                importPath();
              }}
            >
              Import my stuff
            </Button>
          </Group>
        </Stack>
      </Content>
    </PageWrapper>
  );
}
