import { ActionIcon, MantineColor, MantineRadius, MantineSize } from "@mantine/core";
import { HouseIcon } from "@phosphor-icons/react";
import { Link, useLocation } from "react-router";
import useRabbithole from "../../../hooks/useRabbithole";
import { useLayout } from "../../../contexts/LayoutContext";

interface IHomeButtonProps {
  size?: MantineSize;
  radius?: MantineRadius;
  variant?: string;
}

export default function HomeButton({
  size = "md",
  radius = "sm",
  variant = "light",
}: IHomeButtonProps) {
  const { pathname } = useLocation();
  const { isDownRabbithole, currentRabbithole } = useRabbithole();
  const { isMobile } = useLayout();

  const isHome = pathname === "/";

  const defaultColor: MantineColor = "dark.2";

  if (isHome) {
    return null;
  }

  return (
    <Link to={"/"}>
      <ActionIcon variant={variant} color={defaultColor} size={size} radius={radius}>
        <HouseIcon />
      </ActionIcon>
    </Link>
  );
}
