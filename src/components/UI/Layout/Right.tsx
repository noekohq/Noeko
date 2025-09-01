import React, { useEffect, useRef } from "react";
import { ISidebarMode, useLayout } from "../../../contexts/LayoutContext";
import styles from "./Sidebars.module.scss";
import {
  ArrowLineLeftIcon,
  ListMagnifyingGlassIcon,
  SidebarSimpleIcon,
  WifiXIcon,
} from "@phosphor-icons/react";
import {
  ActionIcon,
  Group,
  HoverCard,
  MantineColor,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import useShortcuts from "../../../hooks/useShortcuts";
import ProfileButton from "../../Display/Interactions/ProfileButton";
import { useAuth } from "../../../contexts/AuthContext";
import { userIsSuperuser } from "../../../utils/user";
import { useInteraction } from "../../../contexts/InteractionContext";
import { useLocation, useNavigate } from "react-router";
import useSidebarHover from "../../../hooks/useSidebarHover";
import { useConnection } from "../../../hooks/useConnection";

interface IRightSidebarProps {
  children?: React.ReactNode | React.ReactNode[];
  topLevel?: Record<ISidebarMode, React.ReactNode | React.ReactNode[]>;
  startOpened?: boolean;
  startClosed?: boolean;
}

const RightSidebar = ({
  children,
  topLevel,
  startOpened,
  startClosed,
}: IRightSidebarProps) => {
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

  const { isOnline, isLoading: loadingConnection } = useConnection();

  useEffect(() => {
    setHasContent(!!children);
  }, [children]);

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

  const openable = !!children;

  useEffect(() => {
    if (!openable) {
      setMode("collapsed");
    }
  }, [openable]);

  useEffect(() => {
    if (isMobile) {
      setMode("collapsed");
    }
  }, []);

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

  const defaultColor: MantineColor = "dark.3";

  const Global: Record<typeof mode, JSX.Element> = {
    open: (
      <Group justify="space-between" align="center" wrap="nowrap">
        {!!topLevel?.open && topLevel.open}
        {openable && (
          <ActionIcon
            onClick={() => {
              setMode("collapsed");
            }}
            variant="subtle"
            size={isMobile ? "sm" : "md"}
            color={defaultColor}
          >
            <SidebarSimpleIcon
              style={{
                transform: "rotate(180deg)",
              }}
            />
          </ActionIcon>
        )}
        <Group gap="xs">
          {!isOnline && !loadingConnection && (
            <HoverCard width="300px" openDelay={300} radius="lg">
              <HoverCard.Target>
                <ActionIcon
                  size={isMobile ? "sm" : "md"}
                  color={defaultColor}
                  variant="subtle"
                >
                  <WifiXIcon weight="bold" />
                </ActionIcon>
              </HoverCard.Target>
              <HoverCard.Dropdown>
                <Text size="sm" c="dimmed" mb="sm">
                  The connection to the server has been disrupted... Noeko is
                  attempting to automatically re-connect. If it seems like it's
                  taking a while, refreshing the page may help.
                </Text>
                <Text size="sm" c="dimmed">
                  For any questions, concerns, or feedback, please contact{" "}
                  <a href="mailto:support@noeko.app">support@noeko.app</a>.
                </Text>
              </HoverCard.Dropdown>
            </HoverCard>
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
            color={defaultColor}
          >
            <SidebarSimpleIcon />
          </ActionIcon>
        )}
        <Group>
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
            color={defaultColor}
          >
            <SidebarSimpleIcon
              style={{
                transform: "rotate(180deg)",
              }}
            />
          </ActionIcon>
        )}
        <ProfileButton />
        <ActionIcon
          variant="light"
          onClick={openSpotlight}
          size="sm"
          color={defaultColor}
        >
          <ListMagnifyingGlassIcon size={16} />
        </ActionIcon>
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
      {["open", "hovering"].includes(mode) && !isMobile ? (
        <>
          {children && <div className={styles.content}>{children}</div>}
          <div className={styles.global} {...globalElementProps}>
            {Global[mode]}
          </div>
        </>
      ) : (
        <>
          <div className={styles.global} {...globalElementProps}>
            {Global[mode]}
          </div>
          {children && <div className={styles.content}>{children}</div>}
        </>
      )}
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
