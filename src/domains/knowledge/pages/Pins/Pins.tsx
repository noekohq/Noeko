import { useEffect } from "react";
import { Stack, Title, Text, Loader, Group } from "@mantine/core";
import { Trans } from "@lingui/react/macro";
import { IConnectable } from "../../../../../shared/types/constellation";
import useFetch from "@core/hooks/useFetch";
import PageWrapper from "@core/design/layout/PageWrapper";
import LeftSidebar from "@core/design/components/Layout/Left";
import RightSidebar from "@core/design/components/Layout/Right";
import Content from "@core/design/components/Layout/Content";
import Nav from "@core/design/components/Layout/Nav";
import TopBar from "@core/design/components/Layout/TopBar";
import { useSearch } from "@domains/discovery/contexts/SearchContext";
import { useNavigate } from "react-router";
import { getThingsFromConnectables } from "@core/design/components/Paper/Things/thingUtils";
import { GridFourIcon, ListIcon, PushPinIcon } from "@phosphor-icons/react";
import PaperThings from "@core/design/components/Paper/Things/PaperThings";
import usePins from "../../hooks/usePins";

export default function PinsPage() {
  const { pins, loadingPins } = usePins();

  const {
    global: {
      query: { get: searchQuery },
    },
  } = useSearch();

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
                <Trans>Your pins</Trans>
              </Group>
            </Title>
          </Group>

          {loadingPins && (
            <Group justify="center">
              <Loader />
            </Group>
          )}

          {!loadingPins && pins?.length === 0 && (
            <Text size="sm" c="dimmed">
              <Trans>No pinned items.</Trans>
            </Text>
          )}

          <PaperThings
            storageKey="pins"
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
