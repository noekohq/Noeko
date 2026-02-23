import { useEffect, useState } from "react";
import { ISource } from '../../../../../app/database/models/source';
import useFetch from '@core/hooks/useFetch';
import PageWrapper from '@/components/Layout/PageWrapper';
import Content from '@core/design/components/Layout/Content';
import LeftSidebar from '@core/design/components/Layout/Left';
import RightSidebar from '@core/design/components/Layout/Right';
import StatusBar from '@core/design/components/Layout/Bottom';
import { ActionIcon, Badge, Group, HoverCard, Stack, Text, TextInput, Title } from "@mantine/core";
import { MegaphoneIcon, PlusIcon } from "@phosphor-icons/react";
import { useInteraction } from '@/contexts/InteractionContext';
import SourceCard from '@domains/knowledge/components/Sources/SourceCard';
import ConnectableTable from '@/components/Display/Data/ConnectableTable';
import Nav from '@core/design/components/Layout/Nav';
import TopBar from '@core/design/components/Layout/TopBar';

export default function SourceList() {
  const { data: sources, load: loadSources } = useFetch<undefined, ISource[]>({
    url: "/sources",
  });

  useEffect(() => {
    loadSources();
  }, []);

  const {
    actions: {
      newSource,
      feedback: { openFeedbackModal },
    },
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
      <TopBar />
      <LeftSidebar></LeftSidebar>
      <Content>
        <Stack>
          <Group justify="space-between">
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
            <HoverCard openDelay={400} width="300px">
              <HoverCard.Target>
                <Badge color="orange" size="sm" variant="light">
                  PREVIEW
                </Badge>
              </HoverCard.Target>
              <HoverCard.Dropdown>
                <Stack gap="xs">
                  <Text size="sm">
                    Sources is currently under active development and some features might not work
                    as expected. We're looking for feedback as we learn and grow :)
                  </Text>
                  <Text size="xs" c="dimmed">
                    This feature will remain free during its experimental phases, rate limits may
                    apply in future iterations.
                  </Text>
                  <ActionIcon
                    size="sm"
                    variant="light"
                    color="gray"
                    onClick={() => {
                      openFeedbackModal();
                    }}
                  >
                    <MegaphoneIcon />
                  </ActionIcon>
                </Stack>
              </HoverCard.Dropdown>
            </HoverCard>
          </Group>
          <ConnectableTable connectables={sources?.map((s) => ({ ...s, type: "source" })) ?? []} />
        </Stack>
      </Content>
      <Nav />
      <RightSidebar></RightSidebar>
    </PageWrapper>
  );
}
