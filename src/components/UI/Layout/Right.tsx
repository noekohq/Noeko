import React, { useEffect, useRef } from "react";
import { ISidebarMode, useLayout } from "../../../contexts/LayoutContext";
import styles from "./Sidebars.module.scss";
import {
  ArrowLineLeftIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ChatCircleDotsIcon,
  ListMagnifyingGlassIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { ActionIcon, Group, Stack, Tooltip } from "@mantine/core";
import useShortcuts from "../../../hooks/useShortcuts";
import ProfileButton from "./ProfileButton";
import { useAuth } from "../../../contexts/AuthContext";
import { userIsSuperuser } from "../../../utils/user";
import { useInteraction } from "../../../contexts/InteractionContext";
import { useLocation, useNavigate } from "react-router";
import useSidebarHover from "../../../hooks/useSidebarHover";

interface IRightSidebarProps {
  children?: React.ReactNode | React.ReactNode[];
  topLevel?: Record<ISidebarMode, React.ReactNode | React.ReactNode[]>;
}

const RightSidebar = ({ children, topLevel }: IRightSidebarProps) => {
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
      layout: {
        spotlight: { open: openSpotlight },
      },
    },
  } = useInteraction();

  const { pathname } = useLocation();

  const Global: Record<typeof mode, JSX.Element> = {
    open: (
      <Group justify="space-between">
        {!!topLevel?.open && topLevel.open}
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
    hovering: (
      <Group justify="space-between">
        {!!topLevel?.open && topLevel.open}
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
        {!!topLevel?.open && topLevel.open}
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
            {pathname !== "/admin/users" && (
              <ActionIcon
                variant="subtle"
                onClick={() => {
                  navigate("/admin/users");
                }}
                size="sm"
              >
                <UsersIcon size={16} />
              </ActionIcon>
            )}
            {pathname !== "/admin/feedback" && (
              <ActionIcon
                variant="subtle"
                onClick={() => {
                  navigate("/admin/feedback");
                }}
                size="sm"
              >
                <ChatCircleDotsIcon size={16} />
              </ActionIcon>
            )}
          </>
        )}
      </Stack>
    ),
    compact: (
      <div>
        {!!topLevel?.open && topLevel.open}
        <ArrowLineLeftIcon />
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
      className={`${styles.sidebar} ${styles.right} ${modeToClass[mode]}`}
      {...sidebarProps}
    >
      <div className={styles.global} {...globalElementProps}>
        {Global[mode]}
      </div>
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
  if (!["open", "hovering"].includes(mode)) {
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
