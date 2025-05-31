import React, { useEffect, useState, useMemo, useCallback } from "react";
import styles from "./Sidebars.module.scss";
import { ActionIcon, Button, Flex, Stack, Text, Tooltip } from "@mantine/core";
import {
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
  HouseSimple,
  MegaphoneSimple,
  Scroll,
} from "@phosphor-icons/react";
import useShortcuts from "../../hooks/useShortcuts"; // Adjust path
import { useLayout } from "../../contexts/LayoutContext"; // Using your specific context
import { useMediaQuery } from "@mantine/hooks"; // Local isMobile, context one also available via useLayout().isMobile
import { useAuth } from "../../contexts/AuthContext";
import { Link, useLocation } from "react-router";
import { getCurrentTimeOfDay } from "../../utils/datetime";
import { useInteraction } from "../../contexts/InteractionContext";

type LeftSidebarProps = {
  children?: React.ReactNode | React.ReactNode[];
  forceCollapsed?: boolean;
};

export default function LeftSidebar({
  children,
  forceCollapsed = false,
}: LeftSidebarProps) {
  // Using your specific LayoutContext structure
  const { leftSidebar, isMobile: isContextMobile } = useLayout();

  // You can choose to use isContextMobile or the local one.
  // Local one ensures this component's responsiveness logic is self-contained.
  const isLocalMobile = useMediaQuery("(max-width: 768px)");
  const currentIsMobile = isLocalMobile; // Or isContextMobile, depending on preference

  const canBeToggled = useMemo(
    () => children !== undefined && !forceCollapsed,
    [children, forceCollapsed],
  );

  const isEffectivelyOpen = useMemo(
    () => canBeToggled && leftSidebar.opened,
    [canBeToggled, leftSidebar.opened],
  );

  useEffect(() => {
    if (forceCollapsed || children === undefined) {
      if (leftSidebar.opened) {
        leftSidebar.setOpened(false); // Use context's setter
      }
    }
    // If `forceCollapsed` becomes false, and children exist,
    // the sidebar doesn't automatically re-open; it respects the last `leftSidebar.opened` state.
    // This seems like reasonable behavior.
  }, [
    forceCollapsed,
    children,
    leftSidebar,
    leftSidebar.opened,
    leftSidebar.setOpened,
  ]); // Added leftSidebar.setOpened to dependencies

  const handleToggleSidebar = useCallback(() => {
    if (canBeToggled) {
      leftSidebar.setOpened(!leftSidebar.opened); // Use context's setter
    }
  }, [canBeToggled, leftSidebar]); // Added leftSidebar to dependencies

  useShortcuts({
    shortcuts: [
      {
        keys: { ctrl: true, key: "q" },
        run: handleToggleSidebar,
      },
    ],
  });

  const sidebarClasses = `${styles.leftSidebar} ${
    isEffectivelyOpen ? styles.opened : styles.closed
  }`;

  const mainFlexProps = {
    direction: currentIsMobile
      ? isEffectivelyOpen
        ? "column"
        : "row"
      : ("column" as "column" | "row"),
    justify: "flex-start",
    align: currentIsMobile
      ? isEffectivelyOpen
        ? "center"
        : "center"
      : isEffectivelyOpen
        ? "flex-start"
        : "center",
    gap: "md",
    className: sidebarClasses,
    style: currentIsMobile && !isEffectivelyOpen ? { minHeight: "50px" } : {},
  };

  const {
    actions: {
      feedback: { openFeedbackModal },
    },
  } = useInteraction();

  return (
    <>
      <Flex {...mainFlexProps}>
        <LeftSidebarHeader
          isEffectivelyOpen={isEffectivelyOpen}
          canBeToggled={canBeToggled}
          onToggleClick={handleToggleSidebar} // Pass the toggle handler
        />
        <Stack w="100%">
          {isEffectivelyOpen ? (
            <Tooltip label="Share your thoughts or report an issue">
              <Button
                size="xs"
                fullWidth
                leftSection={<MegaphoneSimple />}
                variant="light"
                onClick={() => openFeedbackModal()}
              >
                I have feedback!
              </Button>
            </Tooltip>
          ) : (
            <Tooltip
              label="Share your thoughts"
              position={currentIsMobile ? "bottom" : "right"}
              withArrow
            >
              <ActionIcon
                variant="light"
                color="blue"
                onClick={() => openFeedbackModal()}
                aria-label="Give us feedback"
              >
                <MegaphoneSimple weight="regular" />
              </ActionIcon>
            </Tooltip>
          )}
          {isEffectivelyOpen && (
            <Tooltip label="View changelog">
              <Link
                to="/updates"
                style={{
                  textDecoration: "none",
                }}
              >
                <Button
                  size="xs"
                  fullWidth
                  leftSection={<Scroll />}
                  variant="default"
                >
                  View changelog
                </Button>
              </Link>
            </Tooltip>
          )}
        </Stack>

        {isEffectivelyOpen && children && (
          <>
            <div className={styles.content}>{children}</div>
          </>
        )}
      </Flex>
    </>
  );
}

type LeftSidebarHeaderProps = {
  isEffectivelyOpen: boolean;
  canBeToggled: boolean;
  onToggleClick: () => void; // Callback for toggling
};

function LeftSidebarHeader({
  isEffectivelyOpen,
  canBeToggled,
  onToggleClick,
}: LeftSidebarHeaderProps) {
  const { user } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === "/";
  // isMobile can be taken from useLayout if preferred and LayoutContext is guaranteed to be above this
  // For now, keeping local useMediaQuery for independence or if context's isMobile is not suitable
  const isMobile = useMediaQuery("(max-width: 768px)");

  const ToggleIcon = isEffectivelyOpen
    ? isMobile
      ? CaretUp
      : CaretLeft
    : isMobile
      ? CaretDown
      : CaretRight;

  return (
    <Flex
      justify="space-between"
      align={isMobile ? (isEffectivelyOpen ? "center" : "center") : "center"}
      direction={
        isMobile
          ? isEffectivelyOpen
            ? "column"
            : "row"
          : isEffectivelyOpen
            ? "row"
            : "column"
      }
      gap="sm"
      w="100%"
    >
      {isEffectivelyOpen && (
        <Text size="sm" c="dimmed" lineClamp={1}>
          Good {getCurrentTimeOfDay()},{" "}
          {user?.firstName ?? user?.email ?? "Guest"}
        </Text>
      )}
      <Flex
        direction={
          isMobile
            ? "row-reverse"
            : isEffectivelyOpen
              ? "row-reverse"
              : "column"
        }
        gap="sm"
        style={{
          alignSelf: isMobile && !isEffectivelyOpen ? "flex-end" : "auto",
        }}
      >
        {canBeToggled && (
          <Tooltip
            label={`${isEffectivelyOpen ? "Collapse" : "Expand"} Sidebar (Ctrl + Q)`}
            position="right"
            withArrow
          >
            <ActionIcon
              onClick={onToggleClick} // Use the passed handler
              variant="subtle"
              aria-label={
                isEffectivelyOpen ? "Collapse sidebar" : "Expand sidebar"
              }
            >
              <ToggleIcon weight={"bold"} />
            </ActionIcon>
          </Tooltip>
        )}
        {!isHome && (
          <Tooltip label="Go Home (Ctrl/Cmd + H)" position="right" withArrow>
            <ActionIcon
              component={Link}
              to="/"
              variant="subtle"
              aria-label="Go to homepage"
            >
              <HouseSimple weight="bold" />
            </ActionIcon>
          </Tooltip>
        )}
      </Flex>
    </Flex>
  );
}
