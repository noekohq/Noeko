import {
  ActionIcon,
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import Content from "../../components/UI/Layout/Content";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import { PlusIcon, RabbitIcon } from "@phosphor-icons/react";
import useFetch from "../../hooks/useFetch";
import { IRabbithole } from "../../../app/database/models/rabbithole";
import { useEffect } from "react";
import { useInteraction } from "../../contexts/InteractionContext";
import RabbitholeCard from "../../components/Display/Rabbitholes/RabbitholeCard";

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
          {!!rabbitholes?.length && (
            <SimpleGrid
              cols={{
                sm: 1,
                md: 2,
              }}
            >
              {rabbitholes.map((rabbithole) => {
                return (
                  <RabbitholeCard
                    key={rabbithole.id.toString()}
                    rabbithole={rabbithole}
                    navigateOnCardClick
                  />
                );
              })}
            </SimpleGrid>
          )}
        </Stack>
      </Content>
      <RightSidebar></RightSidebar>
    </PageWrapper>
  );
}
