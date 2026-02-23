import {
  ActionIcon,
  Button,
  Group,
  SimpleGrid,
  Space,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import PageWrapper from '@/components/Layout/PageWrapper';
import Content from '@core/design/components/Layout/Content';
import LeftSidebar from '@core/design/components/Layout/Left';
import RightSidebar from '@core/design/components/Layout/Right';
import { PlusIcon, RabbitIcon } from "@phosphor-icons/react";
import useFetch from '@core/hooks/useFetch';
import { IRabbithole } from '../../../../../app/database/models/rabbithole';
import { useEffect, useMemo, useState } from "react";
import { useInteraction } from '@/contexts/InteractionContext';
import { getRabbitholeThingDescription, getRabbitholeThingName } from '@domains/rabbitholes/utils/rabbitholes';
import Nav from '@core/design/components/Layout/Nav';
import TopBar from '@core/design/components/Layout/TopBar';
import GridCard from '@core/design/components/Paper/Things/GridCard';
import { getThingPropsFromRabbithole } from '@core/design/components/Paper/Things/thingUtils';
import { formatDateTime } from '@core/utils/formatting';

export default function Rabbitholes() {
  const { load: loadRabbitholes, data: rabbitholes } = useFetch<undefined, IRabbithole[]>({
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
        })
    );
  }, [rabbitholes, filterQuery]);

  return (
    <PageWrapper>
      <TopBar />
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
            mb="md"
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
              spacing="xs"
              cols={{
                base: 2,
                sm: 2,
                md: 3,
                lg: 4,
              }}
            >
              {filteredRabbitholes.map((rabbithole) => {
                const props = getThingPropsFromRabbithole(rabbithole, {
                  detail: `Last active ${formatDateTime(rabbithole.updatedAt)}`,
                });
                return <GridCard key={rabbithole.id.toString()} {...props} />;
              })}
            </SimpleGrid>
          )}
          <Space my="lg" />
        </Stack>
      </Content>
      <Nav />
      <RightSidebar></RightSidebar>
    </PageWrapper>
  );
}
