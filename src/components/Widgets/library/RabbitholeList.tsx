import { Stack, Title } from "@mantine/core";
import { IRabbithole } from "../../../../app/database/models/rabbithole";
import { IWidgetConfig } from "../index.d";
import styles from "./RabbitholeList.module.scss";
import useFetch from "../../../hooks/useFetch";
import RabbitholeCard from "../../Display/Rabbitholes/RabbitholeCard";
import { useEffect } from "react";

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
        <Title order={3}>Recent Rabbitholes</Title>
        {recentRabbitholes?.map((rabbithole) => {
          return <RabbitholeCard rabbithole={rabbithole} />;
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
