import { Avatar, Group } from "@mantine/core";
import styles from "./Nav.module.scss";
import {
  ArrowLineDownIcon, // New Icon: "Dock it"
  CalendarCheckIcon,
  HouseIcon,
  PushPinIcon, // New Icon: "Pin it"
  TagIcon,
  DoorOpenIcon,
} from "@phosphor-icons/react";
import { ConstellationIcon, RabbitholeIcon, SpyglassIcon } from "@core/design/icons/Icons";
import { useLocation, useNavigate } from "react-router";
import React, { useEffect, useState } from "react";
import CaptureButton from "@core/design/components/Interactions/CaptureButton";
import { useLayout, useLayoutScroll } from "@/contexts/LayoutContext";
import { useInteraction } from "@/contexts/InteractionContext";
import MyButton from "@core/design/components/Interactions/MyButton";
import { useAuth } from "@domains/identity/contexts/AuthContext";
import useRabbithole from "@domains/rabbitholes/hooks/useRabbithole";
import { CaretUpIcon } from "@phosphor-icons/react/dist/ssr";

type INavProps = {
  children?: React.ReactNode | React.ReactNode[];
  rabbitholeAction?: {
    label: string;
    onClick: () => void;
  };
};

const Drawer = ({ children }: INavProps) => {
  return <>{children}</>;
};
Drawer.displayName = "Nav.Drawer";

export default function Nav({ children, rabbitholeAction }: INavProps) {
  const {
    isMobile,
    elements: {
      nav: {
        drawer: {
          isOpen: isDrawerOpen,
          toggle: toggleDrawer,
          setHasContent: setDrawerHasContent,
          hasContent: hasDrawerContent,
        },
      },
      mobileEditorToolbar,
    },
  } = useLayout();
  const { isScrolled, scrollDirection, check: checkScrolled } = useLayoutScroll();
  const { isSuperuser } = useAuth();
  const {
    state: {
      zen: { get: isZen },
    },
  } = useInteraction();
  const iconSize = isMobile ? 20 : 16;

  const { pathname } = useLocation();

  const [isCollapsed, setIsCollapsed] = useState(false);

  let drawerContent: React.ReactNode = null;

  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && (child.type as any).displayName === "Nav.Drawer") {
      drawerContent = (child.props as any)?.children;
    }
  });

  useEffect(() => {
    setDrawerHasContent(!!drawerContent && isMobile);
    return () => {
      setDrawerHasContent(false);
    };
  }, [drawerContent, isMobile]);

  const { currentRabbithole, exitRabbithole } = useRabbithole();
  const contextualAction = currentRabbithole
    ? { label: "Exit Rabbithole", onClick: exitRabbithole }
    : rabbitholeAction;

  const activeMap = {
    search: () => pathname.startsWith("/search"),
    rabbitholes: () => pathname.startsWith("/rabbithole"),
    tags: () => pathname.startsWith("/tag"),
    constellation: () => pathname.startsWith("/constellation"),
    spyglass: () => pathname.startsWith("/spyglass"),
    agenda: () => pathname.startsWith("/agenda"),
    home: () => pathname === "/",
  };

  useEffect(() => {
    checkScrolled();
  }, []);

  const navigate = useNavigate();

  const isHidden = () => {
    if (isScrolled && scrollDirection === "down") {
      return true;
    }
    if (isZen) {
      return true;
    }
    if (isMobile && mobileEditorToolbar.isVisible) {
      return true;
    }
    return false;
  };

  const handleCollapseToggle = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div
      className={`${styles.nav} ${isHidden() ? styles.hidden : ""} ${
        hasDrawerContent && isMobile ? styles.hasDrawer : ""
      } ${isCollapsed ? styles.collapsed : ""}`}
    >
      {isDrawerOpen && <div className={styles.backdrop} />}
      {hasDrawerContent && isMobile && (
        <>
          <div className={`${styles.drawer} ${isDrawerOpen ? styles.open : ""}`}>
            {drawerContent}
          </div>
          <div
            className={`${styles.handle} ${isDrawerOpen ? styles.open : ""}`}
            onClick={toggleDrawer}
          >
            <div className={styles.indicator}>
              <CaretUpIcon weight="bold" />
            </div>
          </div>
        </>
      )}
      {contextualAction && (
        <button className={styles.rabbitholeAction} onClick={contextualAction.onClick}>
          <DoorOpenIcon weight="bold" />
          {contextualAction.label}
        </button>
      )}
      <div
        className={`${styles.options} ${hasDrawerContent && isMobile ? styles.hasDrawer : ""} ${
          contextualAction ? styles.hasRabbitholeAction : ""
        }`}
      >
        {!isMobile && (
          <button
            className={`${styles.action} ${activeMap.constellation() ? styles.active : ""}`}
            onClick={() => navigate("/constellation")}
          >
            <ConstellationIcon
              color="var(--mantine-color-dark-2)"
              weight={activeMap.search() ? "fill" : "bold"}
              size={iconSize}
            />
          </button>
        )}
        {/*{!isMobile && isSuperuser && (
          <button
            className={`${styles.action} ${
              activeMap.agenda() ? styles.active : ""
            }`}
            onClick={() => navigate("/agenda")}
          >
            <CalendarCheckIcon
              color="var(--mantine-color-dark-2)"
              weight={activeMap.agenda() ? "fill" : "bold"}
              size={iconSize}
            />
          </button>
        )}*/}
        <button
          className={`${styles.action} ${activeMap.spyglass() ? styles.active : ""}`}
          onClick={() => navigate("/spyglass")}
        >
          <SpyglassIcon
            color="var(--mantine-color-dark-2)"
            weight={activeMap.search() ? "fill" : "bold"}
            size={iconSize}
          />
        </button>
        {!isMobile && (
          <button
            className={`${styles.action} ${activeMap.tags() ? styles.active : ""}`}
            onClick={() => {
              navigate("/tags");
            }}
          >
            <TagIcon weight="bold" size={iconSize} />
          </button>
        )}
        <button
          className={`${styles.action} ${activeMap.rabbitholes() ? styles.active : ""}`}
          onClick={() => {
            if (currentRabbithole?.id.toString()) {
              navigate(`/rabbitholes/${currentRabbithole.id.toString()}`);
              return;
            }
            navigate("/rabbitholes");
          }}
        >
          <RabbitholeIcon color="var(--mantine-color-dark-2)" weight="bold" size={iconSize} />
        </button>
        {isMobile && <CaptureButton />}
        <button
          className={`${styles.action} ${activeMap.home() ? styles.active : ""}`}
          onClick={() => navigate("/")}
        >
          <HouseIcon weight={activeMap.home() ? "fill" : "bold"} size={iconSize} />
        </button>
        {isMobile && <MyButton />}
        {!isMobile && <CaptureButton />}
        {!isMobile && (
          <button
            className={`${styles.action} ${styles.collapseButton} ${
              isCollapsed ? styles.collapsed : ""
            }`}
            onClick={(e) => {
              e.stopPropagation();
              handleCollapseToggle();
            }}
            title={isCollapsed ? "Pin Open" : "Dock to Bottom"}
          >
            {isCollapsed ? <PushPinIcon weight="bold" /> : <ArrowLineDownIcon weight="bold" />}
          </button>
        )}
      </div>
    </div>
  );
}

Nav.Drawer = Drawer;
