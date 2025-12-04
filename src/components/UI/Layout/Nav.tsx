import { Avatar, Group } from "@mantine/core";
import styles from "./Nav.module.scss";
import {
  CalendarCheckIcon,
  CaretUpIcon,
  HouseIcon,
  MagnifyingGlassIcon,
  UserIcon,
} from "@phosphor-icons/react";
import {
  ConstellationIcon,
  RabbitholeIcon,
  SpyglassIcon,
} from "../../Utils/Icons/Icons";
import { useLocation, useNavigate } from "react-router";
import React, { useEffect, useState } from "react";
import CaptureButton from "../../Display/Interactions/CaptureButton";
import { useLayout } from "../../../contexts/LayoutContext";
import { useInteraction } from "../../../contexts/InteractionContext";
import MyButton from "../../Display/Interactions/MyButton";
import { useAuth } from "../../../contexts/AuthContext";
import useRabbithole from "../../../hooks/useRabbithole";

type INavProps = {
  children?: React.ReactNode | React.ReactNode[];
};

const Drawer = ({ children }: INavProps) => {
  return <>{children}</>;
};
Drawer.displayName = "Nav.Drawer";

export default function Nav({ children }: INavProps) {
  const {
    isMobile,
    scroll: { isScrolled, scrollDirection, check: checkScrolled },
    elements: {
      nav: {
        drawer: {
          isOpen: isDrawerOpen,
          toggle: toggleDrawer,
          setHasContent: setDrawerHasContent,
          hasContent: hasDrawerContent,
        },
      },
    },
  } = useLayout();
  const { isSuperuser } = useAuth();

  const {
    state: {
      zen: { get: isZen },
    },
  } = useInteraction();
  const iconSize = isMobile ? 20 : 16;

  const { pathname } = useLocation();

  let drawerContent: React.ReactNode = null;

  React.Children.forEach(children, (child) => {
    if (
      React.isValidElement(child) &&
      (child.type as any).displayName === "Nav.Drawer"
    ) {
      drawerContent = (child.props as any)?.children;
    }
  });

  useEffect(() => {
    setDrawerHasContent(!!drawerContent && isMobile);
    return () => {
      setDrawerHasContent(false);
    };
  }, [drawerContent, isMobile]);

  const { currentRabbithole } = useRabbithole();

  const activeMap = {
    search: () => {
      return pathname.startsWith("/search");
    },
    rabbitholes: () => {
      return pathname.startsWith("/rabbithole");
    },
    constellation: () => {
      return pathname.startsWith("/constellation");
    },
    spyglass: () => {
      return pathname.startsWith("/spyglass");
    },
    agenda: () => {
      return pathname.startsWith("/agenda");
    },
    home: () => {
      return pathname === "/";
    },
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
    return false;
  };

  return (
    <div
      className={`${styles.nav} ${isHidden() ? styles.hidden : ""} ${
        hasDrawerContent && isMobile ? styles.hasDrawer : ""
      }`}
    >
      {isDrawerOpen && <div className={styles.backdrop} />}
      {hasDrawerContent && isMobile && (
        <>
          <div
            className={`${styles.drawer} ${isDrawerOpen ? styles.open : ""}`}
          >
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
      <div
        className={`${styles.options} ${hasDrawerContent && isMobile ? styles.hasDrawer : ""}`}
      >
        {!isMobile && (
          <button
            className={`${styles.action} ${
              activeMap.constellation() ? styles.active : ""
            }`}
            onClick={() => navigate("/constellation")}
          >
            <ConstellationIcon
              color="var(--mantine-color-dark-2)"
              weight={activeMap.search() ? "fill" : "bold"}
              size={iconSize}
            />
          </button>
        )}
        {!isMobile && isSuperuser && (
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
        )}
        <button
          className={`${styles.action} ${
            activeMap.spyglass() ? styles.active : ""
          }`}
          onClick={() => navigate("/spyglass")}
        >
          <SpyglassIcon
            color="var(--mantine-color-dark-2)"
            weight={activeMap.search() ? "fill" : "bold"}
            size={iconSize}
          />
        </button>
        <button
          className={`${styles.action} ${
            activeMap.rabbitholes() ? styles.active : ""
          }`}
          onClick={() => {
            if (currentRabbithole?.id.toString()) {
              navigate(`/rabbitholes/${currentRabbithole.id.toString()}`);
              return;
            }
            navigate("/rabbitholes");
          }}
        >
          <RabbitholeIcon
            color="var(--mantine-color-dark-2)"
            weight="bold"
            size={iconSize}
          />
        </button>
        {isMobile && <CaptureButton />}
        <button
          className={`${styles.action} ${
            activeMap.home() ? styles.active : ""
          }`}
          onClick={() => navigate("/")}
        >
          <HouseIcon
            weight={activeMap.home() ? "fill" : "bold"}
            size={iconSize}
          />
        </button>
        {isMobile && <MyButton />}
        {!isMobile && <CaptureButton />}
      </div>
    </div>
  );
}

Nav.Drawer = Drawer;
