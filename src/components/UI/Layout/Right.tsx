import React, { useEffect } from "react";
import { useLayout } from "../../../contexts/LayoutContext";
import styles from "./Sidebars.module.scss";
import {
  ArrowLineLeftIcon,
  ArrowLineRightIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ChatCircleDots,
  ChatCircleDotsIcon,
  ListMagnifyingGlassIcon,
  SidebarSimpleIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { ActionIcon, Flex, Group, Stack, Tooltip } from "@mantine/core";
import useShortcuts from "../../../hooks/useShortcuts";
import { useHotkeys } from "@mantine/hooks";
import ProfileButton from "./ProfileButton";
import { useAuth } from "../../../contexts/AuthContext";
import { userIsSuperuser } from "../../../utils/user";
import { useInteraction } from "../../../contexts/InteractionContext";
import { useNavigate } from "react-router";

interface IRightSidebarProps {
  children?: React.ReactNode | React.ReactNode[];
}

const RightSidebar = ({ children }: IRightSidebarProps) => {
  const navigate = useNavigate();
  const {
    elements: {
      rightSidebar: {
        mode: { get: mode, set: setMode, toggle: toggleMode },
        content: { setHasContent },
      },
    },
    isMobile,
  } = useLayout();
  const { user } = useAuth();
  const isSuperuser = userIsSuperuser(user);

  useEffect(() => {
    setHasContent(!!children);
  }, [children]);

  const openable = !!children;

  useEffect(() => {
    if (!openable) {
      setMode("collapsed");
    }
  }, [openable]);

  useShortcuts({
    shortcuts: openable
      ? [
          {
            keys: { ctrl: true, key: "l" },
            run: () => {
              toggleMode();
            },
          },
        ]
      : [],
  });

  const {
    actions: {
      layout: {
        spotlight: { open: openSpotlight },
      },
    },
  } = useInteraction();

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
          {isSuperuser && (
            <>
              <Tooltip label="Open spotlight">
                <ActionIcon variant="light" onClick={openSpotlight}>
                  <ListMagnifyingGlassIcon />
                </ActionIcon>
              </Tooltip>
            </>
          )}
          <ProfileButton />
        </Group>
      </Group>
    ),
    collapsed: (
      <Stack align="center">
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
        <ActionIcon variant="light" onClick={openSpotlight} size="sm">
          <ListMagnifyingGlassIcon size={16} />
        </ActionIcon>
        {isSuperuser && (
          <>
            <ActionIcon
              variant="subtle"
              onClick={() => {
                navigate("/admin/users");
              }}
              size="sm"
            >
              <UsersIcon size={16} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              onClick={() => {
                navigate("/admin/users");
              }}
              size="sm"
            >
              <ChatCircleDotsIcon size={16} />
            </ActionIcon>
          </>
        )}
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
  return children;
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
  return children;
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
  return children;
};
