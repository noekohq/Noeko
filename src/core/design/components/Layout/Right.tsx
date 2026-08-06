import React, { useEffect, useRef } from "react";
import { ISidebarMode, useLayout } from "@/contexts/LayoutContext";
import styles from "./Sidebars.module.scss";
import {
  ArrowLineLeftIcon,
  ListMagnifyingGlassIcon,
  MegaphoneIcon,
  SidebarSimpleIcon,
  WifiXIcon,
} from "@phosphor-icons/react";
import {
  ActionIcon,
  Badge,
  Group,
  HoverCard,
  MantineColor,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import useShortcuts from "@core/hooks/useShortcuts";
import ProfileButton from "@core/design/components/Interactions/ProfileButton";
import { useAuth } from "@domains/identity/contexts/AuthContext";
import { userIsSuperuser } from "@domains/identity/utils/user";
import { useInteraction } from "@/contexts/InteractionContext";
import { useLocation, useNavigate } from "react-router";
import useSidebarHover from "@core/hooks/useSidebarHover";
import { useConnection } from "@domains/knowledge/hooks/useConnection";
import StageIndicator from "@core/design/components/Utils/StageIndicator";

interface IRightSidebarProps {
  children?: React.ReactNode | React.ReactNode[];
  topLevel?: Record<ISidebarMode, React.ReactNode | React.ReactNode[]>;
  startOpened?: boolean;
  startClosed?: boolean;
}

const RightSidebar = ({ children, topLevel, startOpened, startClosed }: IRightSidebarProps) => {
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
  }, [isMobile, setMode]);

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
      feedback: { openFeedbackModal },
    },
    state: {
      zen: { get: isZen },
    },
  } = useInteraction();

  const { pathname } = useLocation();

  const defaultColor: MantineColor = "dark.2";

  const Global: Record<typeof mode, React.ReactNode> = {
    open: (
      <Group justify="space-between" align="center" wrap="nowrap">
        {!!topLevel?.open && topLevel.open}
        {openable && (
          <ActionIcon
            onClick={() => {
              setMode("collapsed");
            }}
            aria-label="Close right sidebar"
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
        <Group gap="xs">
          <HoverCard openDelay={400} width="300px">
            <HoverCard.Target>
              <Badge
                color="gray"
                size="sm"
                variant="light"
                styles={{ label: { color: "var(--mantine-color-text)" } }}
              >
                BETA
              </Badge>
            </HoverCard.Target>
            <HoverCard.Dropdown>
              <Stack gap="xs">
                <Text size="sm">
                  Noeko is current in active development, and we're working on making improvements
                  every day as we work towards a stable release.
                </Text>
                <Text size="sm">
                  The best way to support the project right now is to provide{" "}
                  <i>honest and useful feedback</i>. This allows us to make constant improvements
                  and ensure that Noeko meets the needs of its users.
                </Text>
                <Text size="xs">
                  For a more detailed Roadmap, check out our{" "}
                  <a href="https://www.noeko.app/roadmap" target="_blank">
                    Roadmap Page
                  </a>
                  .
                </Text>
                <ActionIcon
                  size="sm"
                  variant="light"
                  color="blue"
                  onClick={() => {
                    openFeedbackModal();
                  }}
                >
                  <MegaphoneIcon size="12" weight="bold" />
                </ActionIcon>
              </Stack>
            </HoverCard.Dropdown>
          </HoverCard>
          {!isOnline && !loadingConnection && (
            <HoverCard width="300px" openDelay={300} radius="lg">
              <HoverCard.Target>
                <ActionIcon size={"md"} color={defaultColor} variant="subtle">
                  <WifiXIcon weight="bold" />
                </ActionIcon>
              </HoverCard.Target>
              <HoverCard.Dropdown>
                <Text size="sm" c="dimmed" mb="sm">
                  The connection to the server has been disrupted... Noeko is attempting to
                  automatically re-connect. If it seems like it's taking a while, refreshing the
                  page may help.
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
            aria-label="Close right sidebar"
            variant="subtle"
            size={"md"}
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
            aria-label="Open right sidebar"
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
        <ActionIcon variant="subtle" onClick={openSpotlight} size="md" color={defaultColor}>
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
      className={`${styles.sidebar} ${styles.right} ${modeToClass[mode]}`}
      // {...sidebarProps}
    >
      <div className={styles.global}>{Global[mode]}</div>
      {children && <div className={styles.content}>{children}</div>}
    </aside>
  );
};

export default RightSidebar;

type IContentProps = {
  children: React.ReactNode | React.ReactNode[];
};

RightSidebar.Open = function RightSidebarOpen({ children }: IContentProps) {
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

RightSidebar.PersistentOpen = function RightSidebarPersistentOpen({ children }: IContentProps) {
  const {
    elements: {
      rightSidebar: {
        mode: { get: mode },
      },
    },
  } = useLayout();
  const visible = ["open", "hovering"].includes(mode);
  return (
    <div hidden={!visible} aria-hidden={!visible}>
      {children}
    </div>
  );
};

RightSidebar.Collapsed = function RightSidebarCollapsed({ children }: IContentProps) {
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

RightSidebar.Compact = function RightSidebarCompact({ children }: IContentProps) {
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
