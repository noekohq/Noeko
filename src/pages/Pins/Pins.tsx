import { useEffect } from "react";
import { Stack, Title, Text, Loader, Group } from "@mantine/core";
import { IConnectable } from "../../../app/services/Graph";
import useFetch from "../../hooks/useFetch";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import Content from "../../components/UI/Layout/Content";
import Nav from "../../components/UI/Layout/Nav";
import TopBar from "../../components/UI/Layout/TopBar";
import { useSearch } from "../../contexts/SearchContext";
import ConnectableThing from "../../components/Display/Interactions/Connections/ConnectableThing";
import { useNavigate } from "react-router";
import PaperThing from "../../components/Display/Paper/Things/PaperThing";
import { getThingPropsFromConnectable } from "../../components/Display/Paper/Things/thingUtils";

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
    if (!searchQuery) {
      loadPins();
    }
  }, [searchQuery]);

  const navigate = useNavigate();

  return (
    <PageWrapper>
      <TopBar />
      <LeftSidebar></LeftSidebar>
      <Content>
        <Stack gap="xl">
          <Group justify="space-between">
            <Title order={1}>
              <Group gap="lg">Pinned Items</Group>
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

          {!loading && pins && pins.length > 0 && (
            <Stack>
              {pins.map((thing) => {
                const props = getThingPropsFromConnectable(thing, {}, true);
                return <PaperThing key={thing.id.toString()} {...props} />;
              })}
            </Stack>
          )}
        </Stack>
      </Content>
      <Nav />
      <RightSidebar></RightSidebar>
    </PageWrapper>
  );
}
