import React, { useEffect, useRef } from "react";
import { ISidebarMode, useLayout } from "../../../contexts/LayoutContext";
import styles from "./Sidebars.module.scss";
import {
  ArrowLineRightIcon,
  CaretLeftIcon,
  CaretRightIcon,
  HouseIcon,
  HouseSimpleIcon,
  MegaphoneIcon,
  RabbitIcon,
  SidebarSimpleIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Flex,
  Group,
  MantineColor,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import useShortcuts from "../../../hooks/useShortcuts";
import { useHotkeys } from "@mantine/hooks";
import { Link, useLocation } from "react-router";
import useSidebarHover from "../../../hooks/useSidebarHover";
import { useInteraction } from "../../../contexts/InteractionContext";
import { useLandscape } from "../../../contexts/LandscapeContext";
import { RabbitholeIndicator } from "../../Display/Rabbitholes/RabbitholeIndicator";
import useRabbithole from "../../../hooks/useRabbithole";
import HomeButton from "./HomeButton";

interface ILeftSidebarProps {
  children?: React.ReactNode | React.ReactNode[];
  topLevel?: { [key in ISidebarMode]?: React.ReactNode | React.ReactNode[] };
}

const LeftSidebar = ({ children, topLevel }: ILeftSidebarProps) => {
  const {
    elements: {
      leftSidebar: {
        mode: { get: mode, set: setMode, toggle: toggleMode },
        content: { setHasContent },
      },
    },
    isMobile,
  } = useLayout();

  useEffect(() => {
    if (isMobile) {
      setMode("collapsed");
    }
  }, []);

  const { pathname } = useLocation();

  const { isDownRabbithole, currentRabbithole } = useRabbithole();

  const isHome = isDownRabbithole
    ? pathname === `/rabbitholes/${currentRabbithole?.id.toString()}`
    : pathname === "/";

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

  const {
    actions: {
      feedback: { openFeedbackModal },
    },
  } = useInteraction();

  const defaultColor: MantineColor = "dark.3";

  const Global: Record<typeof mode, JSX.Element> = {
    open: (
      <Group justify="space-between">
        {!!topLevel?.open && <Group gap="xs">{topLevel.open}</Group>}
        <Group gap="xs">
          <ActionIcon
            onClick={() => {
              setMode("collapsed");
            }}
            variant="subtle"
            size={isMobile ? "sm" : "md"}
            color={defaultColor}
          >
            <SidebarSimpleIcon />
          </ActionIcon>
          <HomeButton />
          <ActionIcon
            onClick={() => {
              openFeedbackModal();
            }}
            variant="subtle"
            color={defaultColor}
          >
            <MegaphoneIcon />
          </ActionIcon>
        </Group>
      </Group>
    ),
    hovering: (
      <Group justify={"space-between"}>
        {!!topLevel?.hovering && <Group gap="xs">{topLevel.hovering}</Group>}
        {!!topLevel?.open && !topLevel.hovering && (
          <Group gap="xs">{topLevel.open}</Group>
        )}
        <Group gap="xs">
          <HomeButton />
          <ActionIcon
            onClick={() => {
              openFeedbackModal();
            }}
            variant="light"
            color={defaultColor}
          >
            <MegaphoneIcon />
          </ActionIcon>
          <ActionIcon
            onClick={() => {
              setMode("collapsed");
            }}
            variant="subtle"
            size={isMobile ? "sm" : "md"}
            color={defaultColor}
          >
            <SidebarSimpleIcon />
          </ActionIcon>
        </Group>
      </Group>
    ),
    collapsed: (
      <Stack>
        {!!topLevel?.collapsed && topLevel.collapsed}
        {openable && (
          <ActionIcon
            onClick={() => {
              setMode("open");
            }}
            variant="subtle"
            size={"md"}
            color={defaultColor}
          >
            <SidebarSimpleIcon />
          </ActionIcon>
        )}
        <HomeButton />
        <ActionIcon
          onClick={() => {
            openFeedbackModal();
          }}
          color={defaultColor}
          variant="subtle"
        >
          <MegaphoneIcon />
        </ActionIcon>
      </Stack>
    ),
    compact: (
      <div>
        {!!topLevel?.compact && topLevel.compact}
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
      {["open", "hovering"].includes(mode) && !isMobile ? (
        <>
          {!!children && (
            <>
              <div className={styles.content}>{children}</div>
            </>
          )}
          <div className={styles.global} {...globalElementProps}>
            {Global[mode]}
          </div>
        </>
      ) : (
        <>
          <div className={styles.global} {...globalElementProps}>
            {Global[mode]}
          </div>
          {!!children && (
            <>
              <div className={styles.content}>{children}</div>
            </>
          )}
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
