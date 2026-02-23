import { useEffect } from "react";
import { Stack, Title, Text, Loader, Group, SimpleGrid } from "@mantine/core";
import { IConnectable } from "../../../app/services/Graph";
import useFetch from '@/hooks/useFetch';
import PageWrapper from '@/components/Layout/PageWrapper';
import LeftSidebar from '@core/design/components/Layout/Left';
import RightSidebar from '@core/design/components/Layout/Right';
import Content from '@core/design/components/Layout/Content';
import Nav from '@core/design/components/Layout/Nav';
import TopBar from '@core/design/components/Layout/TopBar';
import { useSearch } from '@/contexts/SearchContext';
import ConnectableThing from '@/components/Display/Interactions/Connections/ConnectableThing';
import { useNavigate } from "react-router";
import PaperThing from '@core/design/components/Paper/Things/PaperThing';
import {
  getThingPropsFromConnectable,
  getThingsFromConnectables,
} from '@core/design/components/Paper/Things/thingUtils';
import { GridFourIcon, ListIcon, PushPinIcon } from "@phosphor-icons/react";
import GridCard from '@core/design/components/Paper/Things/GridCard';
import PaperThings from '@core/design/components/Paper/Things/PaperThings';

export default function PinsPage() {
  const {
    data: pins,
    loading,
    load: loadPins,
  } = useFetch<undefined, IConnectable[]>({
    url: "/pins/things",
  });

  const {
    global: {
      query: { get: searchQuery },
    },
  } = useSearch();

  useEffect(() => {
    loadPins();
  }, []);

  const navigate = useNavigate();

  return (
    <PageWrapper>
      <TopBar />
      <LeftSidebar></LeftSidebar>
      <Content>
        <Stack gap="sm">
          <Group justify="space-between">
            <Title order={1}>
              <Group gap="sm">
                <PushPinIcon size={24} weight="duotone" />
                Your pins
              </Group>
            </Title>
          </Group>

          {loading && (
            <Group justify="center">
              <Loader />
            </Group>
          )}

          {!loading && pins?.length === 0 && (
            <Text size="sm" c="dimmed">
              No pinned items.
            </Text>
          )}

          <PaperThings
            modes={[
              {
                value: "list",
                icon: ListIcon,
              },
              {
                value: "grid",
                icon: GridFourIcon,
              },
            ]}
            things={pins ? getThingsFromConnectables(pins, {}, true) : []}
          />
        </Stack>
      </Content>
      <Nav />
      <RightSidebar></RightSidebar>
    </PageWrapper>
  );
}
