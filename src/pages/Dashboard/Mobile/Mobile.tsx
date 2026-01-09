import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Divider,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  UnstyledButton,
} from "@mantine/core";
import {
  ArrowsInSimpleIcon,
  ArrowsOutSimpleIcon,
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CaretDownIcon,
  CaretUpIcon,
  LightningIcon,
  ListIcon,
  ShareNetworkIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ISharedThing } from "../../../../app/database/models/share";
import { IFriendUser } from "../../../../app/database/models/user";
import { IShelfData } from "../../../../app/services/Recommendations";
import AcceleratorShelf, {
  IAcceleratorShelfProps,
} from "../../../components/Display/Acceleration/AcceleratorShelf";
import ConnectableThing from "../../../components/Display/Interactions/Connections/ConnectableThing";
import PaperThings from "../../../components/Display/Paper/Things/PaperThings";
import { getThingsFromConnectables } from "../../../components/Display/Paper/Things/thingUtils";
import PageWrapper from "../../../components/Layout/PageWrapper";
import Content from "../../../components/UI/Layout/Content";
import Nav from "../../../components/UI/Layout/Nav";
import TopBar from "../../../components/UI/Layout/TopBar";
import { Pillbar } from "../../../components/UI/Layout/Utils/Pillbar";
import LangtonsAntLoader from "../../../components/Utils/Loading/AntLoader";
import UnderConstruction from "../../../components/Utils/UnderConstruction";
import { useAuth } from "../../../contexts/AuthContext";
import useFetch from "../../../hooks/useFetch";
import { formatDateTime } from "../../../utils/formatting";
import { userInitials } from "../../../utils/user";
import styles from "./Mobile.module.scss";

interface IRelationship {
  user: IFriendUser;
  incoming: ISharedThing[];
  outgoing: ISharedThing[];
  lastActivity: Date;
}

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
              <Pillbar.Tab value="shared">Shared</Pillbar.Tab>
            </Pillbar.List>

            <Pillbar.Panel value="overview">
              <AcceleratorOverview setTab={setCurrentTab} />
            </Pillbar.Panel>

            <Pillbar.Panel value="shared">
              <Shared />
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

// --- SHARED TAB (New) ---

function Shared() {
  const { user: currentUser } = useAuth();

  const { load: loadShared, data: sharedThings } = useFetch<
    undefined,
    ISharedThing[]
  >({
    url: "/sharing",
  });

  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    loadShared();
  }, []);

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const relationships = useMemo(() => {
    if (!sharedThings || !currentUser) return [];

    const map = new Map<string, IRelationship>();

    const getEntry = (u: IFriendUser) => {
      const id = u.id;

      if (!map.has(id)) {
        map.set(id, {
          user: u,
          incoming: [],
          outgoing: [],
          lastActivity: new Date(0),
        });
      }
      return map.get(id)!;
    };

    sharedThings.forEach((thing) => {
      const thingDate = new Date(thing.updatedAt || thing.sharedAt);

      if (thing.accessLevel === "owner") {
        thing.users.forEach((recipient) => {
          if ("id" in recipient && recipient.id === currentUser.id) return;

          const entry = getEntry(recipient);
          entry.outgoing.push(thing);

          if (thingDate > entry.lastActivity) entry.lastActivity = thingDate;
        });
      } else {
        const owner = thing.owner;
        const entry = getEntry(owner);
        entry.incoming.push(thing);

        if (thingDate > entry.lastActivity) entry.lastActivity = thingDate;
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime(),
    );
  }, [sharedThings, currentUser]);

  const allCollapsed = useMemo(() => {
    if (relationships.length === 0) return true;
    return relationships.every((rel) => {
      const userId = rel.user.id;
      const incomingKey = `${userId}_incoming`;
      const outgoingKey = `${userId}_outgoing`;
      const isIncomingCollapsed =
        rel.incoming.length === 0 || collapsedSections[incomingKey];
      const isOutgoingCollapsed =
        rel.outgoing.length === 0 || collapsedSections[outgoingKey];
      return isIncomingCollapsed && isOutgoingCollapsed;
    });
  }, [relationships, collapsedSections]);

  const toggleAll = () => {
    if (allCollapsed) {
      setCollapsedSections({});
    } else {
      const newCollapsedState: Record<string, boolean> = {};
      relationships.forEach((rel) => {
        const userId =
          "id" in rel.user ? rel.user.id : (rel.user as IFriendUser).email;
        if (rel.incoming.length > 0) {
          newCollapsedState[`${userId}_incoming`] = true;
        }
        if (rel.outgoing.length > 0) {
          newCollapsedState[`${userId}_outgoing`] = true;
        }
      });
      setCollapsedSections(newCollapsedState);
    }
  };

  const getPrincipalName = (p: IFriendUser) => {
    return "firstName" in p
      ? `${p.firstName} ${p.lastName}`
      : (p as IFriendUser).email;
  };

  return (
    <Stack gap="xl" pt="md">
      <Group justify="space-between">
        <Title order={4}>
          <Group gap="xs" align="center">
            <ShareNetworkIcon />
            Sharing
          </Group>
        </Title>
        {relationships.length > 0 && (
          <Button
            size="xs"
            variant="default"
            onClick={toggleAll}
            leftSection={
              allCollapsed ? <ArrowsOutSimpleIcon /> : <ArrowsInSimpleIcon />
            }
          >
            {allCollapsed ? "Expand All" : "Collapse All"}
          </Button>
        )}
      </Group>

      {relationships.length === 0 && (
        <Center h={200}>
          <Text c="dimmed">You haven't shared anything with anyone yet.</Text>
        </Center>
      )}

      {relationships.map((rel) => {
        const userId =
          "id" in rel.user ? rel.user.id : (rel.user as IFriendUser).email;
        const incomingKey = `${userId}_incoming`;
        const outgoingKey = `${userId}_outgoing`;
        const isIncomingCollapsed = collapsedSections[incomingKey];
        const isOutgoingCollapsed = collapsedSections[outgoingKey];
        const userName =
          "firstName" in rel.user
            ? rel.user.firstName
            : (rel.user as IFriendUser).email;

        return (
          <Card key={userId} radius="lg" padding="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between" align="start">
                <Group>
                  <Avatar variant="filled" color="blue" size={42} radius="xl">
                    {userInitials(rel.user)}
                  </Avatar>
                  <Stack gap="4px">
                    <Text fw={700} size="lg" lh={1.2}>
                      {getPrincipalName(rel.user)}
                    </Text>
                    <Text c="dimmed" size="xs">
                      Last active {formatDateTime(rel.lastActivity)}
                    </Text>
                  </Stack>
                </Group>
                <Group gap={4}>
                  {rel.incoming.length > 0 && (
                    <Badge variant="light" color="green">
                      Received {rel.incoming.length}
                    </Badge>
                  )}
                  {rel.outgoing.length > 0 && (
                    <Badge variant="light" color="blue">
                      Sent {rel.outgoing.length}
                    </Badge>
                  )}
                </Group>
              </Group>

              <Divider />

              {rel.incoming.length > 0 && (
                <Stack gap="xs">
                  <UnstyledButton
                    w="100%"
                    onClick={() => toggleSection(incomingKey)}
                  >
                    <Group justify="space-between" c="gray">
                      <Group gap="xs">
                        <ArrowDownLeftIcon weight="bold" />
                        <Text size="xs" fw={700} tt="uppercase">
                          Shared by {userName}
                        </Text>
                      </Group>
                      {isIncomingCollapsed ? (
                        <CaretDownIcon />
                      ) : (
                        <CaretUpIcon />
                      )}
                    </Group>
                  </UnstyledButton>
                  {!isIncomingCollapsed && (
                    <PaperThings
                      modes={[
                        { value: "list", icon: ListIcon },
                        { value: "grid", icon: SquaresFourIcon },
                      ]}
                      things={getThingsFromConnectables(rel.incoming, {}, true)}
                      storageKey={`incoming_${userId.toString()}`}
                    />
                  )}
                </Stack>
              )}

              {rel.outgoing.length > 0 && (
                <Stack gap="xs">
                  {rel.incoming.length > 0 && !isIncomingCollapsed && (
                    <Box h={8} />
                  )}
                  <UnstyledButton
                    w="100%"
                    onClick={() => toggleSection(outgoingKey)}
                  >
                    <Group justify="space-between" c="gray">
                      <Group gap="xs">
                        <ArrowUpRightIcon weight="bold" />
                        <Text size="xs" fw={700} tt="uppercase">
                          Shared by You
                        </Text>
                      </Group>
                      {isOutgoingCollapsed ? (
                        <CaretDownIcon />
                      ) : (
                        <CaretUpIcon />
                      )}
                    </Group>
                  </UnstyledButton>
                  {!isOutgoingCollapsed && (
                    <PaperThings
                      modes={[
                        { value: "list", icon: ListIcon },
                        { value: "grid", icon: SquaresFourIcon },
                      ]}
                      things={getThingsFromConnectables(rel.outgoing, {}, true)}
                      storageKey={`outgoing_${userId.toString()}`}
                    />
                  )}
                </Stack>
              )}
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}
