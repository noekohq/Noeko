// components/RightSidebar/RightSidebar.tsx
import React, { useEffect, useMemo, useCallback, useState } from "react";
import styles from "./Sidebars.module.scss"; // Adjust path
import {
  ActionIcon,
  Avatar,
  Divider,
  Flex,
  Menu,
  Text,
  Tooltip,
} from "@mantine/core"; // Only Divider if needed
import useShortcuts, { IShortcut } from "../../hooks/useShortcuts"; // Adjust path
import { useLayout } from "../../contexts/LayoutContext"; // Adjust path
import { useAuth } from "../../contexts/AuthContext";
import { Link, useLocation, useNavigate } from "react-router";
import { userInitials, userIsSuperuser } from "../../utils/user";
import { useMediaQuery } from "@mantine/hooks";
import {
  ArrowLineLeft,
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
  ChatCircleDots,
  Gear,
  Graph,
  HouseSimple,
  Lightbulb,
  ListMagnifyingGlass,
  MagnifyingGlass,
  Scroll,
  ShieldStar,
  Tag,
  User,
  UsersThree,
} from "@phosphor-icons/react";
import Search from "../Search/Search";
import { useInteraction } from "../../contexts/InteractionContext";

type RightSidebarProps = {
  children?: React.ReactNode;
  toggleOpenShortcuts?: IShortcut["keys"][];
  openOnShortcut?: IShortcut["keys"][];
  forceCollapsed?: boolean;
  defaultClosed?: boolean;
  omitDefaults?: boolean;
};

export default function RightSidebar({
  children,
  toggleOpenShortcuts,
  openOnShortcut,
  forceCollapsed = false,
  defaultClosed = false,
  omitDefaults = false,
}: RightSidebarProps) {
  const { rightSidebar, isMobile: contextIsMobile } = useLayout();

  const canBeToggled = useMemo(
    () => !forceCollapsed,
    [children, forceCollapsed],
  );

  const isEffectivelyOpen = useMemo(
    () => canBeToggled && rightSidebar.opened,
    [canBeToggled, rightSidebar.opened],
  );

  useEffect(() => {
    if (forceCollapsed) {
      if (rightSidebar.opened) {
        rightSidebar.setOpened(false);
      }
    }
  }, [forceCollapsed, children, rightSidebar.opened, rightSidebar.setOpened]); // Include all deps

  useEffect(() => {
    if (defaultClosed && canBeToggled && rightSidebar.opened) {
      rightSidebar.setOpened(false);
    }
  }, [
    defaultClosed,
    canBeToggled,
    rightSidebar.opened,
    rightSidebar.setOpened,
  ]);

  const handleToggleSidebar = useCallback(() => {
    if (canBeToggled) {
      rightSidebar.setOpened(!rightSidebar.opened);
    } else if (!forceCollapsed && children === undefined) {
      // If no children but not forced collapsed, maybe toggle means something else?
      // For now, this case does nothing as canBeToggled is false.
      // If the header icons should always be "toggleable" in appearance even without children,
      // the `canBeToggled` for the *header's* toggle button display might be different.
      // But for content, this is correct.
    }
  }, [
    canBeToggled,
    forceCollapsed,
    children,
    rightSidebar.opened,
    rightSidebar.setOpened,
  ]); // Include all deps

  const handleOpenSidebar = useCallback(() => {
    if (canBeToggled) {
      rightSidebar.setOpened(true);
    }
  }, [canBeToggled, rightSidebar.setOpened]);

  useShortcuts({
    shortcuts: [
      {
        keys: { ctrl: true, key: "l" },
        run: handleToggleSidebar,
      },
      ...(toggleOpenShortcuts
        ? toggleOpenShortcuts.map((s) => ({
            keys: s,
            run: handleToggleSidebar,
          }))
        : []),
      ...(openOnShortcut
        ? openOnShortcut.map((s) => ({
            keys: s,
            run: handleOpenSidebar,
          }))
        : []),
    ],
  });

  const sidebarClasses = `${styles.rightSidebar} ${
    isEffectivelyOpen ? styles.opened : styles.closed
  }`;

  return (
    <div className={sidebarClasses}>
      <RightSidebarHeader
        isEffectivelyOpen={isEffectivelyOpen}
        canBeToggled={!forceCollapsed}
        onToggleClick={handleToggleSidebar}
      />
      {isEffectivelyOpen && children && (
        <>
          <div className={styles.content}>{children}</div>
        </>
      )}
      {isEffectivelyOpen && !omitDefaults && <Divider my="lg" />}
      {isEffectivelyOpen && !omitDefaults && <Search />}
    </div>
  );
}

type IRightSidebarHeaderProps = {
  isEffectivelyOpen: boolean;
  canBeToggled: boolean;
  onToggleClick: () => void;
};

function RightSidebarHeader({
  isEffectivelyOpen,
  canBeToggled,
  onToggleClick,
}: IRightSidebarHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // Get location here if isActiveRoute is used here
  const { pathname } = location;

  const initials = user ? userInitials(user) : "";
  const isSuperuser = user ? (userIsSuperuser(user) ?? false) : false;

  const isActiveRoute = (path: string) => pathname === path;

  const isMobile = useMediaQuery("(max-width: 1024px)");

  const ToggleIcon = isEffectivelyOpen
    ? isMobile
      ? CaretDown
      : CaretRight
    : isMobile
      ? CaretUp
      : CaretLeft;

  const menuNavItems = [
    { label: "Home", icon: HouseSimple, path: "/" },
    { label: "Constellation", icon: Graph, path: "/constellation" },
    { label: "All Ideas", icon: Lightbulb, path: "/ideas" },
    { label: "Spyglass", icon: MagnifyingGlass, path: "/spyglass" },
    { label: "Tags", icon: Tag, path: "/tags" },
    { label: "Updates", icon: Scroll, path: "/updates" },
    ...(isSuperuser
      ? [{ label: "Admin Panel", icon: ShieldStar, path: "/admin" }]
      : []),
  ];

  const userMenuItems = [
    { label: "Profile", icon: User, path: "/settings/profile" },
    { label: "Settings", icon: Gear, path: "/settings" },
  ];

  const {
    actions: {
      layout: {
        spotlight: { open: openSpotlight },
      },
    },
  } = useInteraction();

  return (
    <Flex
      justify={
        isMobile
          ? isEffectivelyOpen
            ? "space-between"
            : "flex-end"
          : "space-between"
      }
      align="center"
      direction={isMobile ? "row" : isEffectivelyOpen ? "row" : "column"}
      gap="md"
      w="100%"
    >
      {canBeToggled && (
        <Tooltip
          label={`Toggle Sidebar (Ctrl + L)`}
          position={isMobile ? "bottom" : "left"}
          withArrow
        >
          <ActionIcon
            onClick={onToggleClick}
            variant="subtle"
            color="gray"
            size="lg" // Consistent sizing
            aria-label={
              isEffectivelyOpen ? "Collapse sidebar" : "Expand sidebar"
            }
          >
            <ToggleIcon weight="bold" />
          </ActionIcon>
        </Tooltip>
      )}

      <Flex
        gap="md"
        align="center"
        direction={
          isMobile
            ? isEffectivelyOpen
              ? "row"
              : "row-reverse"
            : isEffectivelyOpen
              ? "row-reverse"
              : "column"
        }
        style={
          isMobile && !isEffectivelyOpen && !canBeToggled
            ? { marginLeft: "auto" }
            : {}
        }
      >
        <Menu width={220} shadow="md" position="bottom-end">
          <Menu.Target>
            <Tooltip
              label={user?.email || "User Menu"}
              position="left"
              withArrow
              disabled={isEffectivelyOpen || !canBeToggled}
            >
              <Avatar
                color={isSuperuser ? "red" : "blue"}
                variant="filled"
                radius="xl"
                style={{ cursor: "pointer" }}
                onDoubleClick={() => navigate("/")}
                size={
                  isMobile
                    ? "md"
                    : isEffectivelyOpen || !canBeToggled
                      ? "md"
                      : "sm"
                }
              >
                {initials}
              </Avatar>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Views</Menu.Label>
            {menuNavItems.map((item) => (
              <Menu.Item
                key={item.path}
                leftSection={<item.icon weight="bold" size={16} />}
                onClick={() => navigate(item.path)}
              >
                <Text size="sm">{item.label}</Text>
              </Menu.Item>
            ))}
            <Menu.Divider />
            <Menu.Label>User</Menu.Label>
            {userMenuItems.map((item) => (
              <Menu.Item
                key={item.path}
                leftSection={<item.icon weight="bold" size={16} />}
                onClick={() => navigate(item.path)}
              >
                <Text size="sm">{item.label}</Text>
              </Menu.Item>
            ))}
            <Menu.Divider />
            <Menu.Item
              color="red"
              onClick={() => logout && logout()}
              leftSection={<ArrowLineLeft weight="bold" />} // Icon for logout from Phosphor
            >
              <Text size="sm">Logout</Text>
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>

        <Tooltip label="Open spotlight">
          <ActionIcon variant="subtle" onClick={openSpotlight}>
            <ListMagnifyingGlass />
          </ActionIcon>
        </Tooltip>

        {(isEffectivelyOpen || (!canBeToggled && !isEffectivelyOpen)) &&
          isSuperuser && (
            <>
              {!isActiveRoute("/admin/users") && (
                <Tooltip label="Manage Users" position="left" withArrow>
                  <ActionIcon
                    component={Link}
                    to="/admin/users"
                    variant="subtle"
                    color="gray"
                  >
                    <UsersThree />
                  </ActionIcon>
                </Tooltip>
              )}
              {!isActiveRoute("/admin/feedback") && (
                <Tooltip label="View Feedback" position="left" withArrow>
                  <ActionIcon
                    component={Link}
                    to="/admin/feedback"
                    variant="subtle"
                    color="gray"
                  >
                    <ChatCircleDots />
                  </ActionIcon>
                </Tooltip>
              )}
            </>
          )}
      </Flex>
    </Flex>
  );
}
