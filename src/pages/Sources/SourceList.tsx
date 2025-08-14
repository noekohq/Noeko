import { useEffect } from "react";
import { ISource } from "../../../app/database/models/source";
import useFetch from "../../hooks/useFetch";
import PageWrapper from "../../components/Layout/PageWrapper";
import Content from "../../components/UI/Layout/Content";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import StatusBar from "../../components/UI/Layout/Bottom";
import { ActionIcon, Group, Stack, Text, Title } from "@mantine/core";
import { PlusIcon } from "@phosphor-icons/react";
import { useInteraction } from "../../contexts/InteractionContext";
import SourceCard from "../../components/Display/Sources/SourceCard";

export default function SourceList() {
  const { data: sources, load: loadSources } = useFetch<undefined, ISource[]>({
    url: "/sources",
  });

  useEffect(() => {
    loadSources();
  }, []);

  const {
    actions: { newSource },
  } = useInteraction();

  return (
    <PageWrapper>
      <LeftSidebar></LeftSidebar>
      <Content>
        <Stack>
          <Title>
            <Group>
              Your Sources
              <ActionIcon
                variant="light"
                color="gray"
                onClick={() => {
                  newSource();
                }}
              >
                <PlusIcon weight="bold" />
              </ActionIcon>
            </Group>
          </Title>
          {sources?.map((source) => {
            return <SourceCard source={source} key={source.id.toString()} />;
          })}
          {!sources?.length && <Text size="sm">No sources yet.</Text>}
        </Stack>
      </Content>
      <StatusBar />
      <RightSidebar></RightSidebar>
    </PageWrapper>
  );
}
