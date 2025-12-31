import { useEffect, useMemo } from "react";
import { ISharedThing } from "../../../app/database/models/share";
import PageWrapper from "../../components/Layout/PageWrapper";
import Content from "../../components/UI/Layout/Content";
import LeftSidebar from "../../components/UI/Layout/Left";
import Nav from "../../components/UI/Layout/Nav";
import RightSidebar from "../../components/UI/Layout/Right";
import TopBar from "../../components/UI/Layout/TopBar";
import useFetch from "../../hooks/useFetch";
import {
  Avatar,
  Card,
  Divider,
  Group,
  Stack,
  Text,
  Title,
  Badge,
  Box,
} from "@mantine/core";
import {
  ListIcon,
  SquaresFourIcon,
  ShareNetworkIcon,
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
} from "@phosphor-icons/react";
import { userInitials } from "../../utils/user";
import { formatDateTime } from "../../utils/formatting";
import PaperThings from "../../components/Display/Paper/Things/PaperThings";
import { getThingsFromConnectables } from "../../components/Display/Paper/Things/thingUtils";
import Search from "../../components/Search/Search";
import { useAuth } from "../../contexts/AuthContext";
import { IPublicUser } from "../../../app/database/models/user";

// Helper interface for our pivoted data structure
interface IRelationship {
  user: IPublicUser; // The "Other Person"
  incoming: ISharedThing[]; // Things they shared with you
  outgoing: ISharedThing[]; // Things you shared with them
  lastActivity: Date; // Most recent interaction (for sorting)
}

export default function Sharing() {
  const { user: currentUser } = useAuth();

  const { load: loadShared, data: sharedThings } = useFetch<
    undefined,
    ISharedThing[]
  >({
    url: "/sharing",
  });

  useEffect(() => {
    loadShared();
  }, []);

  // === Pivot Logic: Transform "List of Things" -> "List of Relationships" ===
  const relationships = useMemo(() => {
    if (!sharedThings || !currentUser) return [];

    const map = new Map<string, IRelationship>();

    // Helper to initialize or retrieve a relationship entry
    const getEntry = (u: IPublicUser) => {
      if (!map.has(u.id)) {
        map.set(u.id, {
          user: u,
          incoming: [],
          outgoing: [],
          lastActivity: new Date(0), // Default to epoch
        });
      }
      return map.get(u.id)!;
    };

    sharedThings.forEach((thing) => {
      const thingDate = new Date(thing.updatedAt || thing.sharedAt);

      if (thing.accessLevel === "owner") {
        thing.users.forEach((recipient) => {
          if (recipient.id === currentUser.id) return;

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

  return (
    <PageWrapper>
      <LeftSidebar>
        <LeftSidebar.Open>
          <Text size="sm">
            You are collaborating with {relationships.length}{" "}
            {relationships.length === 1 ? "person" : "people"}.
          </Text>
        </LeftSidebar.Open>
      </LeftSidebar>
      <TopBar />
      <Content>
        <Stack gap="xl" pt="mb">
          <Title order={2}>
            <Group gap="xs" align="center">
              <ShareNetworkIcon />
              Sharing
            </Group>
          </Title>

          {relationships.length === 0 && (
            <Text c="dimmed">You haven't shared anything with anyone yet.</Text>
          )}

          {relationships.map((rel) => (
            <Card key={rel.user.id} radius="lg" padding="lg">
              <Stack gap="md">
                <Group justify="space-between" align="start">
                  <Group>
                    <Avatar variant="filled" color="blue" size={42} radius="xl">
                      {userInitials(rel.user)}
                    </Avatar>
                    <Stack gap="4px">
                      <Text fw={700} size="lg" lh={1.2}>
                        {rel.user.firstName} {rel.user.lastName}
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
                    <Group gap="xs" c="gray">
                      <ArrowDownLeftIcon weight="bold" />
                      <Text size="xs" fw={700} tt="uppercase">
                        Shared by {rel.user.firstName}
                      </Text>
                    </Group>
                    <PaperThings
                      modes={[
                        { value: "list", icon: ListIcon },
                        { value: "grid", icon: SquaresFourIcon },
                      ]}
                      things={getThingsFromConnectables(rel.incoming, {}, true)}
                    />
                  </Stack>
                )}

                {rel.outgoing.length > 0 && (
                  <Stack gap="xs">
                    {rel.incoming.length > 0 && <Box h={8} />}
                    <Group gap="xs" c="gray">
                      <ArrowUpRightIcon weight="bold" />
                      <Text size="xs" fw={700} tt="uppercase">
                        Shared by You
                      </Text>
                    </Group>
                    <PaperThings
                      modes={[
                        { value: "list", icon: ListIcon },
                        { value: "grid", icon: SquaresFourIcon },
                      ]}
                      things={getThingsFromConnectables(rel.outgoing, {}, true)}
                    />
                  </Stack>
                )}
              </Stack>
            </Card>
          ))}
        </Stack>
      </Content>
      <Nav />
      <RightSidebar>
        <RightSidebar.Open>
          <Search />
        </RightSidebar.Open>
      </RightSidebar>
    </PageWrapper>
  );
}
