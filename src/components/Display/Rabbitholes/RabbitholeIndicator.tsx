import { RabbitIcon, XIcon } from "@phosphor-icons/react";
import styles from "./RabbitholeIndicator.module.scss";
import { ActionIcon, Text } from "@mantine/core";
import { useLandscape } from "../../../contexts/LandscapeContext";

export function RabbitholeIndicator() {
  const {
    rabbitholes: {
      entered: { get: currentRabbithole, set: setRabbithole },
    },
  } = useLandscape();

  return (
    <div className={styles.rabbitholeIndicator}>
      <RabbitIcon weight="bold" />
      <Text
        w={"100%"}
        truncate={"end"}
        size="xs"
        fw="bold"
        tt="uppercase"
        title={currentRabbithole?.name}
      >
        {currentRabbithole?.name}
      </Text>
      <ActionIcon
        onClick={() => setRabbithole(null)}
        variant="subtle"
        size="sm"
        color="gray"
      >
        <XIcon weight="bold" />
      </ActionIcon>
    </div>
  );
}
