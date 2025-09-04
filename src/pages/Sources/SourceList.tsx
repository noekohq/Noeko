import { useEffect, useState } from "react";
import { ISource } from "../../../app/database/models/source";
import useFetch from "../../hooks/useFetch";
import PageWrapper from "../../components/Layout/PageWrapper";
import Content from "../../components/UI/Layout/Content";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import StatusBar from "../../components/UI/Layout/Bottom";
import {
  ActionIcon,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
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

  const [query, setQuery] = useState("");

  const filteredSources = () => {
    if (!query) {
      return sources;
    }
    const filtered = sources?.filter((source) => {
      const includes =
        source.displayName.includes(query) ||
        source.analysis?.abstract.includes(query) ||
        source.content.includes(query);
      return includes;
    });
    return filtered;
  };

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
          <TextInput
            placeholder="Filter sources by name, content, or analysis."
            onChange={(e) => {
              setQuery(e.currentTarget.value);
            }}
            radius="lg"
          />

          {filteredSources()?.map((source) => {
            return <SourceCard source={source} key={source.id.toString()} />;
          })}
          {!filteredSources()?.length && <Text size="sm">No sources.</Text>}
        </Stack>
      </Content>
      <StatusBar />
      <RightSidebar></RightSidebar>
    </PageWrapper>
  );
}
