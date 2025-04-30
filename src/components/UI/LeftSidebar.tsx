import { useEffect, useState } from "react";
import styles from "./LeftSiderbar.module.scss";
import { ActionIcon, Group } from "@mantine/core";
import { ArrowLineLeft, ArrowLineRight } from "@phosphor-icons/react";
import useShortcuts from "../../hooks/useShortcuts";

type LeftSidebarProps = {
  children: React.ReactNode | React.ReactNode[];
};

export default function LeftSidebar({ children }: LeftSidebarProps) {
  const [opened, setOpened] = useState(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      const storedValue = localStorage.getItem("leftSidebarOpened");
      return storedValue !== "false";
    }
    return true;
  });

  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem("leftSidebarOpened", opened.toString());
    }
  }, [opened]);

  const handleToggle = () => {
    setOpened((currentOpened) => !currentOpened);
  };

  useShortcuts({
    shortcuts: [
      {
        keys: { ctrl: true, key: "q" },
        run: () => handleToggle(),
      },
    ],
  });

  return (
    <div
      className={`${styles.leftSidebar} ${opened ? styles.opened : styles.closed}`}
    >
      <Group justify="end">
        <ActionIcon
          onClick={handleToggle}
          variant="subtle"
          aria-label={opened ? "Collapse sidebar" : "Expand sidebar"}
        >
          {opened ? (
            <ArrowLineLeft weight="bold" />
          ) : (
            <ArrowLineRight weight="bold" />
          )}
        </ActionIcon>
      </Group>
      {opened && <div className={styles.content}>{children}</div>}
    </div>
  );
}
