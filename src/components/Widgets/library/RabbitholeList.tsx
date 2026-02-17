import { ActionIcon, Group, Stack, Text, Title } from "@mantine/core";
import { IRabbithole } from "../../../../app/database/models/rabbithole";
import { IWidgetConfig } from "../index.d";
import styles from "./RabbitholeList.module.scss";
import useFetch from "../../../hooks/useFetch";
import { useEffect } from "react";
import RabbitholeButton from "../../Display/Rabbitholes/RabbitholeButton";
import { useInteraction } from "../../../contexts/InteractionContext";
import { PlusIcon } from "@phosphor-icons/react";

export default function RabbitholeList() {
  const { data: recentRabbitholes, load: loadRabbitholes } = useFetch<undefined, IRabbithole[]>({
    url: `/rabbitholes?limit=10`,
  });

  useEffect(() => {
    loadRabbitholes();
  }, []);

  const {
    actions: { newRabbithole },
  } = useInteraction();

  return (
    <div className={styles.rabbitholeList}>
      <Stack gap="xs">
        <Text size="sm" fw="bold" c="dimmed" w="100%">
          <Group wrap="nowrap" justify="space-between">
            Recent Rabbitholes
            <ActionIcon
              size="sm"
              color="dark.2"
              variant="light"
              onClick={() => {
                newRabbithole();
              }}
            >
              <PlusIcon />
            </ActionIcon>
          </Group>
        </Text>
        {!recentRabbitholes?.length && (
          <Text size="sm" c="dimmed">
            No rabbitholes.
          </Text>
        )}
        {recentRabbitholes?.map((rabbithole) => {
          return <RabbitholeButton key={rabbithole.id.toString()} rabbithole={rabbithole} />;
        })}
      </Stack>
    </div>
  );
}

export const config: IWidgetConfig = {
  columns: {
    default: 4,
    min: 4,
    max: 6,
  },
};
