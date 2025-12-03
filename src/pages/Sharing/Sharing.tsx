import { useEffect, useMemo } from "react";
import { IShare, ISharedThing } from "../../../app/database/models/share";
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
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { UsersIcon } from "@phosphor-icons/react";
import { userInitials } from "../../utils/user";
import { formatDateTime } from "../../utils/formatting";
import ConnectableThing from "../../components/Display/Interactions/Connections/ConnectableThing";

export default function Sharing() {
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

  console.log("Shared things: ", sharedThings);
  console.log("Grouped: ", groupedByOwner);

  return (
    <PageWrapper>
      <LeftSidebar></LeftSidebar>
      <TopBar />
      <Content>
        <Stack gap="lg">
          <Title order={2}>
            <Group gap="xs" align="center">
              <UsersIcon />
              Sharing
            </Group>
          </Title>
          {!sortedGroups.length && (
            <Text size="sm">No shared items found.</Text>
          )}
          {sortedGroups.map((group) => (
            <Card radius="lg">
              <Stack>
                <Group key={group.owner.id} gap="xs" align="center">
                  <Avatar
                    variant="filled"
                    src={userInitials(group.owner)}
                    size={20}
                  />
                  <Text size="sm">
                    {group.owner.firstName} {group.owner.lastName}
                  </Text>
                  <Text c="dimmed" size="sm">
                    {formatDateTime(group.lastActivity)}
                  </Text>
                </Group>
                <SimpleGrid
                  cols={{
                    sm: 1,
                    md: 2,
                    lg: 3,
                  }}
                >
                  {group.items.map((item) => (
                    <ConnectableThing
                      key={item.id.toString()}
                      thing={item}
                      link
                    />
                  ))}
                </SimpleGrid>
              </Stack>
            </Card>
          ))}
        </Stack>
      </Content>
      <Nav />
      <RightSidebar></RightSidebar>
    </PageWrapper>
  );
}
