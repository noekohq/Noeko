import styles from "./MobileBar.module.scss";
import { ActionIcon, Group } from "@mantine/core";
import {
  CaretLeftIcon,
  HouseIcon,
  ListMagnifyingGlassIcon,
  SidebarSimpleIcon,
} from "@phosphor-icons/react";
import { useLayout } from "../../../contexts/LayoutContext";
import ProfileButton from "./ProfileButton";
import { Link, useLocation } from "react-router";
import { useInteraction } from "../../../contexts/InteractionContext";

export default function MobileBar() {
  const {
    elements: {
      leftSidebar: {
        mode: { get: leftMode, set: setLeftMode },
        content: { hasContent: leftHasContent },
      },
      rightSidebar: {
        mode: { get: rightMode, set: setRightMode },
        content: { hasContent: rightHasContent },
      },
    },
    isMobile,
    isScrolled,
  } = useLayout();

  const leftModeToClass: Record<typeof leftMode, string> = {
    open: styles.leftOpen,
    collapsed: styles.leftCollapsed,
    compact: styles.leftCompact,
    hovering: `${styles.leftOpen} ${styles.leftHovering}`,
  };

  const rightModeToClass: Record<typeof rightMode, string> = {
    open: styles.rightOpen,
    collapsed: styles.rightCollapsed,
    compact: styles.rightCompact,
    hovering: `${styles.rightOpen} ${styles.rightHovering}`,
  };

  const leftModeClass = leftModeToClass[leftMode];
  const rightModeClass = rightModeToClass[rightMode];

  const { pathname } = useLocation();
  const isHome = pathname === "/";

  const {
    actions: {
      layout: {
        spotlight: { open: openSpotlight },
      },
    },
  } = useInteraction();

  return (
    <div
      className={`${styles.mobileBar} ${isScrolled ? styles.scrolled : ""} ${leftModeClass} ${rightModeClass}`}
    >
      <Group gap="xs">
        {leftHasContent && (
          <ActionIcon
            onClick={() => {
              setLeftMode("open");
            }}
            variant="subtle"
          >
            <SidebarSimpleIcon weight="fill" />
          </ActionIcon>
        )}
        {!isHome && (
          <Link to="/">
            <ActionIcon variant="subtle">
              <HouseIcon />
            </ActionIcon>
          </Link>
        )}
      </Group>
      <Group>
        {rightHasContent && (
          <ActionIcon
            onClick={() => {
              setRightMode("open");
            }}
            variant="subtle"
          >
            <CaretLeftIcon />
          </ActionIcon>
        )}
        <ActionIcon variant="subtle" onClick={openSpotlight}>
          <ListMagnifyingGlassIcon />
        </ActionIcon>
        <ProfileButton />
      </Group>
    </div>
  );
}
