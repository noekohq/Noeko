import React, { useEffect } from "react";
import { useLayout } from "../../../contexts/LayoutContext";
import styles from "./Sidebars.module.scss";
import {
  ArrowLineLeftIcon,
  ArrowLineRightIcon,
  CaretLeftIcon,
  CaretRightIcon,
  SidebarSimpleIcon,
} from "@phosphor-icons/react";
import { ActionIcon, Flex, Group, Stack } from "@mantine/core";
import useShortcuts from "../../../hooks/useShortcuts";
import { useHotkeys } from "@mantine/hooks";
import ProfileButton from "./ProfileButton";

interface IRightSidebarProps {
  children?: React.ReactNode | React.ReactNode[];
}

const RightSidebar = ({ children }: IRightSidebarProps) => {
  const {
    elements: {
      rightSidebar: {
        mode: { get: mode, set: setMode, toggle: toggleMode },
        content: { setHasContent },
      },
    },
    isMobile,
  } = useLayout();

  useEffect(() => {
    setHasContent(!!children);
  }, [children]);

  const openable = !!children;

  useShortcuts({
    shortcuts: [
      {
        keys: { ctrl: true, key: "l" },
        run: () => {
          toggleMode();
        },
      },
    ],
  });

  const Global: Record<typeof mode, JSX.Element> = {
    open: (
      <Group justify="space-between">
        {openable && (
          <ActionIcon
            onClick={() => {
              setMode("collapsed");
            }}
            variant="subtle"
            size={isMobile ? "sm" : "md"}
          >
            <CaretRightIcon />
          </ActionIcon>
        )}
        <Group>
          <ProfileButton />
        </Group>
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
            <CaretLeftIcon />
          </ActionIcon>
        )}
        <ProfileButton />
      </Stack>
    ),
    compact: (
      <div>
        <ArrowLineLeftIcon />
      </div>
    ),
  };

  const modeToClass: Record<typeof mode, string> = {
    open: styles.open,
    collapsed: styles.collapsed,
    compact: styles.compact,
  };

  return (
    <aside className={`${styles.sidebar} ${styles.right} ${modeToClass[mode]}`}>
      <div className={styles.global}>{Global[mode]}</div>
      {children && <div className={styles.content}>{children}</div>}
    </aside>
  );
};

export default RightSidebar;

type IContentProps = {
  children: React.ReactNode | React.ReactNode[];
};

RightSidebar.Open = ({ children }: IContentProps) => {
  const {
    elements: {
      rightSidebar: {
        mode: { get: mode },
      },
    },
  } = useLayout();
  if (mode !== "open") {
    return null;
  }
  return <div>{children}</div>;
};

RightSidebar.Collapsed = ({ children }: IContentProps) => {
  const {
    elements: {
      rightSidebar: {
        mode: { get: mode },
      },
    },
    isMobile,
  } = useLayout();
  if (mode !== "collapsed" || isMobile) {
    return null;
  }
  return <div>{children}</div>;
};

RightSidebar.Compact = ({ children }: IContentProps) => {
  const {
    elements: {
      rightSidebar: {
        mode: { get: mode },
      },
    },
  } = useLayout();
  if (mode !== "compact") {
    return null;
  }
  return <div>{children}</div>;
};
