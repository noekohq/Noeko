import { ActionIcon, MantineColor } from "@mantine/core";
import { HouseIcon } from "@phosphor-icons/react";
import { Link, useLocation } from "react-router";
import useRabbithole from "../../../hooks/useRabbithole";

export default function HomeButton() {
  const { pathname } = useLocation();
  const { isDownRabbithole, currentRabbithole } = useRabbithole();

  const isHome = pathname === "/";

  const defaultColor: MantineColor = "dark.3";

  if (isHome) {
    return null;
  }

  return (
    <Link to={"/"}>
      <ActionIcon variant="subtle" color={defaultColor}>
        <HouseIcon />
      </ActionIcon>
    </Link>
  );
}
