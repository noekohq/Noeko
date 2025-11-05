import {
  ActionIcon,
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import Content from "../../components/UI/Layout/Content";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import { PlusIcon, RabbitIcon } from "@phosphor-icons/react";
import useFetch from "../../hooks/useFetch";
import { IRabbithole } from "../../../app/database/models/rabbithole";
import { useEffect, useMemo, useState } from "react";
import { useInteraction } from "../../contexts/InteractionContext";
import RabbitholeCard from "../../components/Display/Rabbitholes/RabbitholeCard";
import StatusBar from "../../components/UI/Layout/Bottom";
import { getNodeTitle } from "../../utils/graph";
import {
  getRabbitholeThingDescription,
  getRabbitholeThingName,
} from "../../utils/rabbitholes";
import Nav from "../../components/UI/Layout/Nav";

export default function Rabbitholes() {
  const { load: loadRabbitholes, data: rabbitholes } = useFetch<
    undefined,
    IRabbithole[]
  >({
    url: "/rabbitholes",
  });

  useEffect(() => {
    loadRabbitholes();
  }, []);

  const {
    actions: { newRabbithole },
  } = useInteraction();

  const [filterQuery, setFilterQuery] = useState(""); // State for filter query
  const filteredRabbitholes = useMemo(() => {
    if (!rabbitholes) return [];
    if (!filterQuery.trim()) return rabbitholes;

    const query = filterQuery.toLowerCase();
    return rabbitholes.filter(
      (rabbithole) =>
        rabbithole.name.toLowerCase().includes(query) ||
        rabbithole.includes?.find((thing) => {
          const name = getRabbitholeThingName(thing);
          const hasName = !!name?.toLowerCase().includes(query);
          const description = getRabbitholeThingDescription(thing);
          const hasDescription = !!description?.toLowerCase().includes(query);
          return hasName || hasDescription;
        }),
    );
  }, [rabbitholes, filterQuery]);

  return (
    <PageWrapper>
      <LeftSidebar></LeftSidebar>
      <Content>
        <Stack>
          <Group>
            <Group>
              <RabbitIcon size="36px" weight="bold" />
              <Title>Your Rabbitholes</Title>
              <ActionIcon
                variant="light"
                color="green"
                onClick={() => {
                  newRabbithole();
                }}
              >
                <PlusIcon weight="bold" />
              </ActionIcon>
            </Group>
          </Group>
          <TextInput
            placeholder="Filter rabbitholes..."
            value={filterQuery}
            onChange={(event) => setFilterQuery(event.currentTarget.value)}
            mb="md" // Added margin bottom for spacing
            radius="md"
          />
          {!rabbitholes?.length && (
            <>
              <Text c="gray" size="sm">
                You do not have any rabbitholes.
              </Text>
              <Group>
                <Button
                  rightSection={<PlusIcon />}
                  variant="light"
                  onClick={() => {
                    newRabbithole();
                  }}
                >
                  Create One
                </Button>
              </Group>
            </>
          )}
          {!!filteredRabbitholes?.length && (
            <SimpleGrid
              cols={{
                sm: 1,
                md: 2,
              }}
            >
              {filteredRabbitholes.map((rabbithole) => {
                return (
                  <RabbitholeCard
                    key={rabbithole.id.toString()}
                    rabbithole={rabbithole}
                  />
                );
              })}
            </SimpleGrid>
          )}
        </Stack>
      </Content>
      <Nav />
      <RightSidebar></RightSidebar>
    </PageWrapper>
  );
}
