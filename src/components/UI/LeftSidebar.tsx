import { useEffect, useState } from "react";
import styles from "./Sidebars.module.scss";
import { ActionIcon, Divider, Flex, Group, Text } from "@mantine/core";
import {
  ArrowLineDown,
  ArrowLineLeft,
  ArrowLineRight,
  ArrowLineUp,
  HouseSimple,
} from "@phosphor-icons/react";
import useShortcuts from "../../hooks/useShortcuts";
import { getCurrentTimeOfDay } from "../../utils/datetime";
import { useAuth } from "../../contexts/AuthContext";
import { Link, useLocation } from "react-router";
import { useMediaQuery } from "@mantine/hooks";

type LeftSidebarProps = {
  children?: React.ReactNode | React.ReactNode[];
  stayCollapsed?: boolean;
};

export default function LeftSidebar({
  children,
  stayCollapsed,
}: LeftSidebarProps) {
  const { user } = useAuth();

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
    if (stayCollapsed) {
      setOpened(false);
    } else {
      setOpened((currentOpened) => !currentOpened);
    }
  };

  useShortcuts({
    shortcuts: [
      {
        keys: { ctrl: true, key: "q" },
        run: () => handleToggle(),
      },
    ],
  });

  const location = useLocation();

  const isHome = location.pathname === "/";

  const isMobile = useMediaQuery("(max-width: 768px)");

  // if mobile, use up arrow, if desktop, use left arrow
  const ToggleIconClosed = isMobile ? ArrowLineDown : ArrowLineLeft;
  const ToggleIconOpened = isMobile ? ArrowLineUp : ArrowLineRight;

  return (
    <div
      className={`${styles.leftSidebar} ${opened ? styles.opened : styles.closed}`}
    >
      <Flex
        justify="space-between"
        align="center"
        direction={opened ? "row" : "column"}
        gap="md"
      >
        {opened && (
          <Text size="sm">
            Good {getCurrentTimeOfDay()},{" "}
            {user?.firstName ?? user?.email ?? "Guest"}
          </Text>
        )}
        {!isHome && (
          <Link to="/">
            <ActionIcon variant="subtle">
              <HouseSimple weight="bold" />
            </ActionIcon>
          </Link>
        )}
        {!stayCollapsed && (
          <ActionIcon
            onClick={handleToggle}
            variant="subtle"
            aria-label={opened ? "Collapse sidebar" : "Expand sidebar"}
          >
            {opened ? (
              <ToggleIconOpened weight="bold" />
            ) : (
              <ToggleIconClosed weight="bold" />
            )}
          </ActionIcon>
        )}
      </Flex>
      {opened && <Divider my="md" />}
      {opened && <div className={styles.content}>{children}</div>}
    </div>
  );
}
