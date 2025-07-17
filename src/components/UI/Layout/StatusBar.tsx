import React from "react";
import { useLayout } from "../../../contexts/LayoutContext";
import styles from "./StatusBar.module.scss";
import useRabbithole from "../../../hooks/useRabbithole";
import { RabbitholeIndicator } from "../../Display/Rabbitholes/RabbitholeIndicator";
import { Text } from "@mantine/core";

export default function StatusBar() {
  const {
    elements: {
      statusBar: {
        mode: { get: mode, set: setMode },
        message: { get: StatusMessage },
      },
    },
  } = useLayout();

  const { isDownRabbithole } = useRabbithole();

  const hasGlobalContext = isDownRabbithole;

  if (mode == "hidden") {
    return null;
  }

  if (!isDownRabbithole && !StatusMessage) {
    return null;
  }

  return (
    <div
      className={`${styles.bottom} ${StatusMessage ? styles.hasMessage : ""}`}
    >
      {StatusMessage && (
        <div className={styles.message}>
          <Text c="gray" size="xs">
            {StatusMessage}
          </Text>
        </div>
      )}
      {hasGlobalContext && (
        <div
          className={`${styles.global} ${StatusMessage ? styles.hasMessage : ""}`}
        >
          {isDownRabbithole && (
            <div className={styles.rabbitholeIndicatorWrapper}>
              <RabbitholeIndicator />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
