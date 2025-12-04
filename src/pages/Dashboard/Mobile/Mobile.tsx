import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Text,
  Stack,
  Button,
  Center,
  ThemeIcon,
  Avatar,
  Card,
  Group,
  SimpleGrid,
} from "@mantine/core";
import { LightningIcon } from "@phosphor-icons/react";

import PageWrapper from "../../../components/Layout/PageWrapper";
import Content from "../../../components/UI/Layout/Content";
import Nav from "../../../components/UI/Layout/Nav";
import TopBar from "../../../components/UI/Layout/TopBar";
import { Pillbar } from "../../../components/UI/Layout/Utils/Pillbar";
import UnderConstruction from "../../../components/Utils/UnderConstruction";
import styles from "./Mobile.module.scss";
import { userInitials } from "../../../utils/user";
import { formatDateTime } from "../../../utils/formatting";

import useFetch from "../../../hooks/useFetch";
import { ISharedThing } from "../../../../app/database/models/share";

import ConnectableThing from "../../../components/Display/Interactions/Connections/ConnectableThing";
import AcceleratorShelf, {
  IAcceleratorShelfProps,
} from "../../../components/Display/Acceleration/AcceleratorShelf";
import { IShelfData } from "../../../../app/services/Recommendations";
import LangtonsAntLoader from "../../../components/Utils/Loading/AntLoader";

export default function MobileDashboard() {
  const [currentTab, setCurrentTab] = useState("overview");

  return (
    <PageWrapper>
      <TopBar />
      <Content>
        <div className={styles.dashboard}>
          <Pillbar defaultValue={currentTab} onChange={setCurrentTab}>
            <Pillbar.List>
              <Pillbar.Tab value="overview">Overview</Pillbar.Tab>
              <Pillbar.Tab value="agenda">Agenda</Pillbar.Tab>
              <Pillbar.Tab value="insights">Insights</Pillbar.Tab>
              <Pillbar.Tab value="shared">Shared</Pillbar.Tab>
            </Pillbar.List>

            <Pillbar.Panel value="overview">
              <AcceleratorOverview setTab={setCurrentTab} />
            </Pillbar.Panel>

            <Pillbar.Panel value="agenda">
              <UnderConstruction />
            </Pillbar.Panel>
            <Pillbar.Panel value="insights">
              <UnderConstruction />
            </Pillbar.Panel>
            <Pillbar.Panel value="shared">
              <Shared setTab={setCurrentTab} />
            </Pillbar.Panel>
          </Pillbar>
        </div>
      </Content>
      <Nav />
    </PageWrapper>
  );
}

function AcceleratorOverview({ setTab }: { setTab: (t: string) => void }) {
  const navigate = useNavigate();

  const {
    load,
    data: shelves,
    loading,
  } = useFetch<undefined, IShelfData[]>({
    url: "/dashboard/accelerator",
    runOnMount: true,
  });

  if (loading && !shelves) {
    return (
      <Center h={500}>
        <LangtonsAntLoader cellSize={18} stepsPerSecond={10} />
      </Center>
    );
  }

  if (!shelves || shelves.length === 0) {
    return (
      <Center h={300}>
        <Stack align="center" gap="md">
          <ThemeIcon size="xl" radius="xl" variant="light" color="gray">
            <LightningIcon />
          </ThemeIcon>
          <Text>No immediate actions found.</Text>
          <Button variant="light" onClick={() => setTab("agenda")}>
            Check Agenda
          </Button>
        </Stack>
      </Center>
    );
  }

  return (
    <div className={styles.overview}>
      <Stack gap="sm" pb={100}>
        {shelves.map((shelf, index) => {
          const indexToLayout = (): IAcceleratorShelfProps["layout"] => {
            if (index === 0) return "hero";
            return "carousel";
            if ([1, 2].includes(index)) return "carousel";
            return "list";
          };

          return (
            <AcceleratorShelf
              key={shelf.id.toString()}
              shelf={shelf}
              layout={indexToLayout()}
            />
          );
        })}
      </Stack>
    </div>
  );
}

// --- SHARED TAB (Legacy Support) ---

function Shared({ setTab }: { setTab: (t: string) => void }) {
  const { load: loadShared, data: sharedThings } = useFetch<
    undefined,
    ISharedThing[]
  >({
    url: "/sharing",
  });

  useEffect(() => {
    loadShared();
  }, []);

  const groupedByOwner = useMemo(() => {
    if (!sharedThings) return [];

    const grouped = sharedThings.reduce(
      (acc, curr) => {
        acc[curr.owner.id] = [...(acc[curr.owner.id] || []), curr];
        return acc;
      },
      {} as Record<string, ISharedThing[]>,
    );

    return Object.values(grouped).map((items) => {
      const owner = items[0].owner;
      const lastActivity = items.reduce((latest, item) => {
        const itemDate = new Date(item.updatedAt);
        return itemDate > latest ? itemDate : latest;
      }, new Date(0));

      return {
        owner,
        lastActivity,
        items,
      };
    });
  }, [sharedThings]);

  const sortedGroups = useMemo(() => {
    return groupedByOwner.sort(
      (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime(),
    );
  }, [groupedByOwner]);

  if (!sharedThings || sharedThings.length === 0) {
    return (
      <Center h={200}>
        <Text c="dimmed">Nothing has been shared with you yet.</Text>
      </Center>
    );
  }

  return (
    <Stack gap="lg" pb={100}>
      {sortedGroups.map((group) => (
        <Card radius="lg" key={group.owner.id} withBorder>
          <Stack>
            <Group gap="xs" align="center">
              <Avatar
                variant="filled"
                src={userInitials(group.owner)}
                size={24}
                radius="xl"
              />
              <div>
                <Text size="sm" fw={500}>
                  {group.owner.firstName} {group.owner.lastName}
                </Text>
                <Text c="dimmed" size="xs">
                  Shared {formatDateTime(group.lastActivity)}
                </Text>
              </div>
            </Group>
            <SimpleGrid cols={{ base: 1, xs: 2 }}>
              {group.items.map((item) => (
                <ConnectableThing key={item.id.toString()} thing={item} link />
              ))}
            </SimpleGrid>
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}
