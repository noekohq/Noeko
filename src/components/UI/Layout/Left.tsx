import React, { useEffect, useRef } from "react";
import { useLayout } from "../../../contexts/LayoutContext";
import styles from "./Sidebars.module.scss";
import {
  ArrowLineRightIcon,
  CaretLeftIcon,
  CaretRightIcon,
  HouseIcon,
  HouseSimpleIcon,
  SidebarSimpleIcon,
} from "@phosphor-icons/react";
import { ActionIcon, Divider, Flex, Group, Stack } from "@mantine/core";
import useShortcuts from "../../../hooks/useShortcuts";
import { useHotkeys } from "@mantine/hooks";
import { Link, useLocation } from "react-router";
import useSidebarHover from "../../../hooks/useSidebarHover";

interface ILeftSidebarProps {
  children?: React.ReactNode | React.ReactNode[];
}

const LeftSidebar = ({ children }: ILeftSidebarProps) => {
  const {
    elements: {
      leftSidebar: {
        mode: { get: mode, set: setMode, toggle: toggleMode },
        content: { setHasContent },
      },
    },
    isMobile,
  } = useLayout();

  const { pathname } = useLocation();
  const isHome = pathname === "/";

  const openable = !!children;

  useEffect(() => {
    setHasContent(!!children);
  }, [children]);

  useEffect(() => {
    if (!openable) {
      setMode("collapsed");
    }
  }, [openable]);

  useShortcuts({
    shortcuts: openable
      ? [
          {
            keys: { ctrl: true, key: "q" },
            run: (e) => {
              e.preventDefault();
              toggleMode();
            },
          },
        ]
      : [],
  });

  const Global: Record<typeof mode, JSX.Element> = {
    open: (
      <Group justify="end">
        {!isHome && (
          <Link to="/">
            <ActionIcon variant="subtle">
              <HouseIcon />
            </ActionIcon>
          </Link>
        )}
        <ActionIcon
          onClick={() => {
            setMode("collapsed");
          }}
          variant="subtle"
          size={isMobile ? "sm" : "md"}
        >
          <SidebarSimpleIcon />
        </ActionIcon>
      </Group>
    ),
    hovering: (
      <Group justify="end">
        {!isHome && (
          <Link to="/">
            <ActionIcon variant="subtle">
              <HouseIcon />
            </ActionIcon>
          </Link>
        )}
        <ActionIcon
          onClick={() => {
            setMode("collapsed");
          }}
          variant="subtle"
          size={isMobile ? "sm" : "md"}
        >
          <SidebarSimpleIcon />
        </ActionIcon>
      </Group>
    ),
    collapsed: (
      <Stack>
        {openable && (
          <ActionIcon
            onClick={() => {
              setMode("open");
            }}
            variant="subtle"
            size={"md"}
          >
            <SidebarSimpleIcon />
          </ActionIcon>
        )}
        {!isHome && (
          <Link to="/">
            <ActionIcon variant="subtle">
              <HouseIcon />
            </ActionIcon>
          </Link>
        )}
      </Stack>
    ),
    compact: (
      <div>
        <ArrowLineRightIcon />
      </div>
    ),
  };

  const modeToClass: Record<typeof mode, string> = {
    open: styles.open,
    collapsed: styles.collapsed,
    compact: styles.compact,
    hovering: `${styles.open} ${styles.hovering}`,
  };

  const { sidebarProps, globalElementProps } = useSidebarHover({
    mode,
    setMode,
    openable,
  });

  return (
    <aside
      className={`${styles.sidebar} ${styles.left} ${modeToClass[mode]}`}
      {...sidebarProps}
    >
      <div className={styles.global} {...globalElementProps}>
        {Global[mode]}
      </div>
      {!!children && (
        <>
          <div className={styles.content}>{children}</div>
        </>
      )}
    </aside>
  );
};

export default LeftSidebar;

type IContentProps = {
  children: React.ReactNode | React.ReactNode[];
};

LeftSidebar.Open = ({ children }: IContentProps) => {
  const {
    elements: {
      leftSidebar: {
        mode: { get: mode },
      },
    },
  } = useLayout();
  if (!["open", "hovering"].includes(mode)) {
    return null;
  }
  return children;
};

LeftSidebar.Collapsed = ({ children }: IContentProps) => {
  const {
    elements: {
      leftSidebar: {
        mode: { get: mode },
      },
    },
    isMobile,
  } = useLayout();
  if (mode !== "collapsed" || isMobile) {
    return null;
  }
  return children;
};

LeftSidebar.Compact = ({ children }: IContentProps) => {
  const {
    elements: {
      leftSidebar: {
        mode: { get: mode },
      },
    },
  } = useLayout();
  if (mode !== "compact") {
    return null;
  }
  return children;
};
