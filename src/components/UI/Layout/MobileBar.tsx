import styles from "./MobileBar.module.scss";
import { ActionIcon, Group, MantineColor } from "@mantine/core";
import {
  CaretLeftIcon,
  HouseIcon,
  ListMagnifyingGlassIcon,
  SidebarSimpleIcon,
} from "@phosphor-icons/react";
import { useLayout } from "../../../contexts/LayoutContext";
import ProfileButton from "../../Display/Interactions/ProfileButton";
import { Link, useLocation } from "react-router";
import { useInteraction } from "../../../contexts/InteractionContext";
import HomeButton from "../../Display/Interactions/HomeButton";

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

  const defaultColor: MantineColor = "dark.3";

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
            color={defaultColor}
          >
            <SidebarSimpleIcon />
          </ActionIcon>
        )}
        <HomeButton />
      </Group>
      <Group>
        {rightHasContent && (
          <ActionIcon
            onClick={() => {
              setRightMode("open");
            }}
            variant="subtle"
            color={defaultColor}
          >
            <CaretLeftIcon />
          </ActionIcon>
        )}
        <ActionIcon
          variant="subtle"
          onClick={openSpotlight}
          color={defaultColor}
        >
          <ListMagnifyingGlassIcon />
        </ActionIcon>
        <ProfileButton />
      </Group>
    </div>
  );
}
