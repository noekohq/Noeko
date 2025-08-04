import { Button, Group, Stack, Title } from "@mantine/core";
import { IRabbithole } from "../../../../app/database/models/rabbithole";
import { IWidgetConfig } from "../index.d";
import styles from "./RabbitholeList.module.scss";
import useFetch from "../../../hooks/useFetch";
import RabbitholeCard from "../../Display/Rabbitholes/RabbitholeCard";
import { useEffect } from "react";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { Link } from "react-router";
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
      <Stack>
        <Group>
          <Title order={3}>Recent Rabbitholes</Title>
          <Link to="/rabbitholes">
            <Button
              variant="subtle"
              color="gray"
              rightSection={<ArrowRightIcon />}
            >
              See all
            </Button>
          </Link>
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
    default: 6,
    min: 4,
    max: 6,
  },
};
