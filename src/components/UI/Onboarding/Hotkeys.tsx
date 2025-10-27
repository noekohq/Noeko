import {
  Box,
  Card,
  Group,
  Kbd,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IOnboardingProps } from "./Index";
import { getOS } from "../../../utils/platform";
import Shortcut from "../../Utils/Help/Shortcut";
import styles from "./Hotkeys.module.scss";
import { GearIcon } from "@phosphor-icons/react";

export default function Hotkeys({ next, complete }: IOnboardingProps) {
  const isMacos = getOS() === "macos";
  const primaryKey = isMacos ? "⌘" : "Ctrl";

  return (
    <div className={styles.hotkeys}>
      <div className={styles.header}>
        <h2>At the speed of thought</h2>
        <Text size="sm">
          Use your keyboard to search, navigate, and command your workspace.
        </Text>
      </div>
      <div className={styles.body}>
        <div className={styles.card}>
          <Group justify="center">
            <div className={styles.key}>{primaryKey}</div>+{" "}
            <div className={styles.key}>K</div>
          </Group>
          <Text fw="bold">Press {primaryKey} + K anytime.</Text>
          <Text size="sm" c="dimmed">
            Search files, navigate sections, or use commands.
          </Text>
        </div>
        <Group wrap="nowrap" gap="lg">
          <div className={styles.card}>
            <Text fw="bold" size="sm">
              Toggle Left Sidebar
            </Text>
            <Group justify="center">
              <div className={styles.key}>Ctrl</div> +{" "}
              <div className={styles.key}>q</div>
            </Group>
          </div>
          <div className={styles.card}>
            <Text fw="bold" size="sm">
              Toggle Right Sidebar
            </Text>
            <Group justify="center">
              <div className={styles.key}>Ctrl</div> +{" "}
              <div className={styles.key}>l</div>
            </Group>
          </div>
        </Group>
        <Text size="md">
          You can find all keyboard shortcuts at any time from{" "}
          <strong>Settings.</strong>
        </Text>
      </div>
      <div className={styles.action}>
        <button className={styles.button} onClick={next}>
          Got it, next
        </button>
      </div>
    </div>
  );
}
