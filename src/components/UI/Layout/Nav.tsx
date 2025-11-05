import { Avatar, Group } from "@mantine/core";
import styles from "./Nav.module.scss";
import {
  CalendarCheckIcon,
  CalendarIcon,
  HouseIcon,
  HouseSimpleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  RabbitIcon,
  UserIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
  ConstellationIcon,
  RabbitholeIcon,
  SpyglassIcon,
} from "../../Utils/Icons/Icons";
import { useAuth } from "../../../contexts/AuthContext";
import { userInitials, userIsSuperuser } from "../../../utils/user";
import { useLocation, useNavigate } from "react-router";
import { useState } from "react";
import { useDisclosure } from "@mantine/hooks";
import CaptureButton from "../../Display/Interactions/CaptureButton";
import { useLayout } from "../../../contexts/LayoutContext";
import { useInteraction } from "../../../contexts/InteractionContext";

export default function Nav() {
  const {
    isDesktop,
    isWideScreen,
    isUltraWide,
    scroll: { isScrolled, scrollDirection },
  } = useLayout();
  const {
    state: {
      zen: { get: isZen },
    },
  } = useInteraction();
  const isAtLeastDesktop = isDesktop || isWideScreen || isUltraWide;

  const iconSize = isAtLeastDesktop ? 16 : 20;

  const { pathname } = useLocation();

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
    <div className={`${styles.nav} ${isHidden() ? styles.hidden : ""}`}>
      <div className={styles.options}>
        {isAtLeastDesktop && (
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
        {isAtLeastDesktop && (
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
        )}
        {isAtLeastDesktop && (
          <button
            className={`${styles.action} ${activeMap.agenda() ? styles.active : ""}`}
            onClick={() => navigate("/agenda")}
          >
            <CalendarCheckIcon
              color="var(--mantine-color-dark-2)"
              weight={activeMap.agenda() ? "fill" : "bold"}
              size={iconSize}
            />
          </button>
        )}
        {!isAtLeastDesktop && (
          <button
            className={`${styles.action} ${activeMap.search() ? styles.active : ""}`}
            onClick={() => navigate("/search")}
          >
            <MagnifyingGlassIcon
              weight={activeMap.search() ? "fill" : "bold"}
              size={iconSize}
            />
          </button>
        )}
        <button
          className={`${styles.action} ${activeMap.rabbitholes() ? styles.active : ""}`}
          onClick={() => navigate("/rabbitholes")}
        >
          <RabbitholeIcon
            color="var(--mantine-color-dark-2)"
            weight="bold"
            size={iconSize}
          />
        </button>
        {!isAtLeastDesktop && <CaptureButton />}
        <button
          className={`${styles.action} ${activeMap.home() ? styles.active : ""}`}
          onClick={() => navigate("/")}
        >
          <HouseIcon
            weight={activeMap.home() ? "fill" : "bold"}
            size={iconSize}
          />
        </button>
        {!isAtLeastDesktop && (
          <button className={`${styles.action}`}>
            <UserIcon weight="bold" size={iconSize} />
          </button>
        )}
        {isAtLeastDesktop && <CaptureButton />}
      </div>
    </div>
  );
}
