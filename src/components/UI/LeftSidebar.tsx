import { useEffect, useState } from "react";
import styles from "./Sidebars.module.scss";
import { ActionIcon, Divider, Flex, Group, Text, Tooltip } from "@mantine/core";
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
import { useLayout } from "../../contexts/LayoutContext";

type LeftSidebarProps = {
  children?: React.ReactNode | React.ReactNode[];
  stayCollapsed?: boolean;
};

export default function LeftSidebar({
  children,
  stayCollapsed,
}: LeftSidebarProps) {
  const { user } = useAuth();
  const openable = children !== undefined || !stayCollapsed;

  const [opened, setOpened] = useState(() => {
    if (!openable) return false;
    if (typeof window !== "undefined" && window.localStorage) {
      const storedValue = localStorage.getItem("leftSidebarOpened");
      return storedValue !== "false";
    }
    return true;
  });

  const {
    leftSidebar: { setOpened: setLeftSidebarOpened },
  } = useLayout();

  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem("leftSidebarOpened", opened.toString());
    }
    setLeftSidebarOpened(opened);
  }, [opened]);

  const handleToggle = () => {
    if (!openable) return;
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

  const location = useLocation();

  const isHome = location.pathname === "/";

  const isMobile = useMediaQuery("(max-width: 768px)");

  // if mobile, use up arrow, if desktop, use left arrow
  const ToggleIconClosed = isMobile ? ArrowLineDown : ArrowLineRight;
  const ToggleIconOpened = isMobile ? ArrowLineUp : ArrowLineLeft;

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
        <Flex direction={opened ? "row-reverse" : "column"} gap="md">
          {openable && (
            <Tooltip label="Toggle Sidebar (ctrl + q)">
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
            </Tooltip>
          )}
          {!isHome && (
            <Link to="/">
              <Tooltip label="Go home (cmd/ctrl + H)">
                <ActionIcon variant="subtle">
                  <HouseSimple weight="bold" />
                </ActionIcon>
              </Tooltip>
            </Link>
          )}
        </Flex>
      </Flex>
      {opened && <Divider my="md" />}
      {opened && <div className={styles.content}>{children}</div>}
    </div>
  );
}
