import React, { useEffect, useRef } from "react";
import { ISidebarMode, useLayout } from "../../../contexts/LayoutContext";
import styles from "./Sidebars.module.scss";
import {
  ArrowLineRightIcon,
  MegaphoneIcon,
  SidebarSimpleIcon,
} from "@phosphor-icons/react";
import { ActionIcon, Group, MantineColor, Stack, Tooltip } from "@mantine/core";
import useShortcuts from "../../../hooks/useShortcuts";
import { useHotkeys } from "@mantine/hooks";
import { Link, useLocation } from "react-router";
import useSidebarHover from "../../../hooks/useSidebarHover";
import { useInteraction } from "../../../contexts/InteractionContext";
import { useLandscape } from "../../../contexts/LandscapeContext";
import useRabbithole from "../../../hooks/useRabbithole";
import HomeButton from "../../Display/Interactions/HomeButton";

interface ILeftSidebarProps {
  children?: React.ReactNode | React.ReactNode[];
  topLevel?: { [key in ISidebarMode]?: React.ReactNode | React.ReactNode[] };
  startOpened?: boolean;
  startClosed?: boolean;
}

const LeftSidebar = ({
  children,
  topLevel,
  startOpened,
  startClosed,
}: ILeftSidebarProps) => {
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

  useEffect(() => {
    if (startOpened) {
      setMode("open");
    }
  }, [startOpened]);

  useEffect(() => {
    if (startClosed) {
      setMode("collapsed");
    }
  }, [startClosed]);

  const { pathname } = useLocation();

  const { isDownRabbithole, currentRabbithole } = useRabbithole();

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

  const {
    actions: {
      feedback: { openFeedbackModal },
    },
    state: {
      zen: { get: isZen },
    },
  } = useInteraction();

  const defaultColor: MantineColor = "dark.3";

  const Global: Record<typeof mode, React.ReactNode> = {
    open: (
      <Group justify="space-between" align="center" wrap="nowrap">
        {!!topLevel?.open && <Group gap="xs">{topLevel.open}</Group>}
        <Group gap="xs" justify="flex-end" w="100%">
          <HomeButton variant="subtle" />
          <Tooltip label="Give feedback!">
            <ActionIcon
              onClick={() => {
                openFeedbackModal();
              }}
              variant="subtle"
              color={defaultColor}
            >
              <MegaphoneIcon />
            </ActionIcon>
          </Tooltip>
          <ActionIcon
            onClick={() => {
              setMode("collapsed");
            }}
            variant="subtle"
            size={"md"}
            color={defaultColor}
          >
            <SidebarSimpleIcon />
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
          <Tooltip label="Give feedback!">
            <ActionIcon
              onClick={() => {
                openFeedbackModal();
              }}
              variant="subtle"
              color={defaultColor}
            >
              <MegaphoneIcon />
            </ActionIcon>
          </Tooltip>
          <ActionIcon
            onClick={() => {
              setMode("collapsed");
            }}
            variant="subtle"
            size={"md"}
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
        <Tooltip label="Give Feedback!">
          <ActionIcon
            onClick={() => {
              openFeedbackModal();
            }}
            color={defaultColor}
            variant="subtle"
          >
            <MegaphoneIcon />
          </ActionIcon>
        </Tooltip>
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

  // const { sidebarProps, globalElementProps } = useSidebarHover({
  //   mode,
  //   setMode,
  //   openable,
  // });

  if (isZen) {
    return null;
  }

  return (
    <aside
      className={`${styles.sidebar} ${styles.left} ${modeToClass[mode]}`}
      // {...sidebarProps}
    >
      <>
        <div className={styles.global}>{Global[mode]}</div>
        {!!children && (
          <>
            <div className={styles.content}>{children}</div>
          </>
        )}
      </>
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
