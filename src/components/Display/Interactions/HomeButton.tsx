import { ActionIcon, MantineColor } from "@mantine/core";
import { HouseIcon } from "@phosphor-icons/react";
import { Link, useLocation } from "react-router";
import useRabbithole from "../../../hooks/useRabbithole";
import { useLayout } from "../../../contexts/LayoutContext";

export default function HomeButton() {
  const { pathname } = useLocation();
  const { isDownRabbithole, currentRabbithole } = useRabbithole();
  const { isMobile } = useLayout();

  const isHome = pathname === "/";

  const defaultColor: MantineColor = "dark.3";

  if (isHome) {
    return null;
  }

  return (
    <Link to={"/"}>
      <ActionIcon variant={isMobile ? "light" : "subtle"} color={defaultColor}>
        <HouseIcon />
      </ActionIcon>
    </Link>
  );
}
