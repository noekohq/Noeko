import styles from "./MobileBar.module.scss";
import { ActionIcon, Group, MantineColor } from "@mantine/core";
import {
  CaretLeftIcon,
  HouseIcon,
  ListMagnifyingGlassIcon,
  SidebarIcon,
  SidebarSimpleIcon,
} from "@phosphor-icons/react";
import { useLayout } from "../../../contexts/LayoutContext";
import ProfileButton from "../../Display/Interactions/ProfileButton";
import { Link, useLocation } from "react-router";
import { useInteraction } from "../../../contexts/InteractionContext";
import HomeButton from "../../Display/Interactions/HomeButton";
import { useEffect } from "react";

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
    scroll: { isScrolled, scrollDirection },
    isMobile,
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
    state: {
      zen: { get: isZen },
    },
  } = useInteraction();

  const defaultColor: MantineColor = "dark.2";

  return (
    <div
      className={`${styles.mobileBar} ${isScrolled ? styles.scrolled : ""} ${scrollDirection === "up" ? styles.scrollUp : styles.scrollDown} ${leftModeClass} ${rightModeClass}`}
    >
      <Group gap="xs">
        {leftHasContent && !isZen && (
          <ActionIcon
            onClick={() => {
              setLeftMode("open");
            }}
            variant="light"
            color={defaultColor}
            size="lg"
            radius="lg"
          >
            <SidebarSimpleIcon />
          </ActionIcon>
        )}
        <HomeButton size="lg" radius="lg" />
      </Group>
      <Group>
        {rightHasContent && !isZen && (
          <ActionIcon
            onClick={() => {
              setRightMode("open");
            }}
            size="lg"
            variant="light"
            radius="lg"
            color={defaultColor}
          >
            <SidebarSimpleIcon style={{ transform: "rotate(180deg)" }} />
          </ActionIcon>
        )}
        <ActionIcon
          onClick={openSpotlight}
          variant="light"
          size="lg"
          radius="lg"
          color={defaultColor}
        >
          <ListMagnifyingGlassIcon />
        </ActionIcon>
        <ProfileButton />
      </Group>
    </div>
  );
}
