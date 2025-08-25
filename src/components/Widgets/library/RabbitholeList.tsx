import { Group, Stack, Text, Title } from "@mantine/core";
import { IRabbithole } from "../../../../app/database/models/rabbithole";
import { IWidgetConfig } from "../index.d";
import styles from "./RabbitholeList.module.scss";
import useFetch from "../../../hooks/useFetch";
import { useEffect } from "react";
import RabbitholeButton from "../../Display/Rabbitholes/RabbitholeButton";

export default function RabbitholeList() {
  const { data: recentRabbitholes, load: loadRabbitholes } = useFetch<
    undefined,
    IRabbithole[]
  >({
    url: `/rabbitholes?limit=10`,
  });

  useEffect(() => {
    loadRabbitholes();
  }, []);

  return (
    <div className={styles.rabbitholeList}>
      <Stack gap="xs">
        <Group>
          <Text size="sm" fw="bold" c="dimmed" w="100%">
            <Group gap="xs" justify="space-between">
              Recent Rabbitholes
            </Group>
          </Text>
        </Group>
        {recentRabbitholes?.map((rabbithole) => {
          return (
            <RabbitholeButton
              key={rabbithole.id.toString()}
              rabbithole={rabbithole}
            />
          );
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
