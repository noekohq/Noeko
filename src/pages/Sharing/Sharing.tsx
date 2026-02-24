import { useEffect, useMemo, useState } from "react";
import { ISharedThing } from "../../../app/database/models/share";
import { useNavigate } from "react-router";
import PageWrapper from "@/components/Layout/PageWrapper";
import Content from "@core/design/components/Layout/Content";
import LeftSidebar from "@core/design/components/Layout/Left";
import Nav from "@core/design/components/Layout/Nav";
import RightSidebar from "@core/design/components/Layout/Right";
import TopBar from "@core/design/components/Layout/TopBar";
import useFetch from "@core/hooks/useFetch";
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
  UnstyledButton,
  Button,
  ActionIcon,
} from "@mantine/core";
import {
  ListIcon,
  SquaresFourIcon,
  ShareNetworkIcon,
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  ArrowLeftIcon,
  CaretUpIcon,
  CaretDownIcon,
  ArrowsOutSimpleIcon,
  ArrowsInSimpleIcon,
} from "@phosphor-icons/react";
import { userInitials } from "@domains/identity/utils/user";
import { formatDateTime } from "@core/utils/formatting";
import PaperThings from "@core/design/components/Paper/Things/PaperThings";
import { getThingsFromConnectables } from "@core/design/components/Paper/Things/thingUtils";
import Search from "@domains/discovery/components/Search/Search";
import { useAuth } from "@domains/identity/contexts/AuthContext";
import { IFriendUser } from "../../../app/database/models/user";
import { useLayout } from "@/contexts/LayoutContext";

interface IRelationship {
  user: IFriendUser;
  incoming: ISharedThing[];
  outgoing: ISharedThing[];
  lastActivity: Date;
}

export default function Sharing() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const { load: loadShared, data: sharedThings } = useFetch<undefined, ISharedThing[]>({
    url: "/sharing",
  });

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

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
      (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime()
    );
  }, [sharedThings, currentUser]);

  const allCollapsed = useMemo(() => {
    if (relationships.length === 0) return true;
    return relationships.every((rel) => {
      const userId = rel.user.id;
      const incomingKey = `${userId}_incoming`;
      const outgoingKey = `${userId}_outgoing`;
      const isIncomingCollapsed = rel.incoming.length === 0 || collapsedSections[incomingKey];
      const isOutgoingCollapsed = rel.outgoing.length === 0 || collapsedSections[outgoingKey];
      return isIncomingCollapsed && isOutgoingCollapsed;
    });
  }, [relationships, collapsedSections]);

  const toggleAll = () => {
    if (allCollapsed) {
      setCollapsedSections({});
    } else {
      const newCollapsedState: Record<string, boolean> = {};
      relationships.forEach((rel) => {
        const userId = "id" in rel.user ? rel.user.id : (rel.user as IFriendUser).email;
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
    return "firstName" in p ? `${p.firstName} ${p.lastName}` : (p as IFriendUser).email;
  };

  const { isMobile } = useLayout();

  const size = isMobile ? "lg" : "md";
  const radius = "md";

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
        <Stack gap="xl" pt="md">
          <Group justify="space-between">
            <ActionIcon
              onClick={() => navigate(-1)}
              color="gray"
              variant="subtle"
              size={size}
              radius={radius}
            >
              <ArrowLeftIcon weight="bold" />
            </ActionIcon>
            {relationships.length > 0 && (
              <Button
                size="xs"
                variant="default"
                onClick={toggleAll}
                leftSection={allCollapsed ? <ArrowsOutSimpleIcon /> : <ArrowsInSimpleIcon />}
              >
                {allCollapsed ? "Expand All" : "Collapse All"}
              </Button>
            )}
          </Group>

          <Title order={2}>
            <Group gap="xs" align="center">
              <ShareNetworkIcon />
              Sharing
            </Group>
          </Title>

          {relationships.length === 0 && (
            <Text c="dimmed">You haven't shared anything with anyone yet.</Text>
          )}

          {relationships.map((rel) => {
            const userId = "id" in rel.user ? rel.user.id : (rel.user as IFriendUser).email;
            const incomingKey = `${userId}_incoming`;
            const outgoingKey = `${userId}_outgoing`;
            const isIncomingCollapsed = collapsedSections[incomingKey];
            const isOutgoingCollapsed = collapsedSections[outgoingKey];
            const userName =
              "firstName" in rel.user ? rel.user.firstName : (rel.user as IFriendUser).email;

            return (
              <Card key={userId} radius="lg" padding="md">
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
                      <UnstyledButton w="100%" onClick={() => toggleSection(incomingKey)}>
                        <Group justify="space-between" c="gray">
                          <Group gap="xs">
                            <ArrowDownLeftIcon weight="bold" />
                            <Text size="xs" fw={700} tt="uppercase">
                              Shared by {userName}
                            </Text>
                          </Group>
                          {isIncomingCollapsed ? <CaretDownIcon /> : <CaretUpIcon />}
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
                      {rel.incoming.length > 0 && !isIncomingCollapsed && <Box h={8} />}
                      <UnstyledButton w="100%" onClick={() => toggleSection(outgoingKey)}>
                        <Group justify="space-between" c="gray">
                          <Group gap="xs">
                            <ArrowUpRightIcon weight="bold" />
                            <Text size="xs" fw={700} tt="uppercase">
                              Shared by You
                            </Text>
                          </Group>
                          {isOutgoingCollapsed ? <CaretDownIcon /> : <CaretUpIcon />}
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
