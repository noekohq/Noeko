import { ArrowRightIcon } from "@phosphor-icons/react";
import { RabbitholeIcon } from "../../../Utils/Icons/Icons";
import styles from "./PaperRabbithole.module.scss";
import { IRabbithole } from "../../../../../app/database/models/rabbithole";
import React from "react";
import { MantineSize } from "@mantine/core";
import { PaperContextMenu } from "../PaperContextMenu";
import { useNavigate } from "react-router";

export type IRabbitholeState = "applied" | "suggested" | "display";

interface IPaperRabbitholeProps {
  onClick?: () => void;
  active?: boolean;
  rabbithole?: IRabbithole;
  onRemove?: (rabbitholeId: string) => void;
  onApply?: (rabbitholeId: string) => void;
  state: IRabbitholeState;
  size?: MantineSize;
  maxWidth?: string | number;
}

export default function PaperRabbithole({
  onClick,
  active = false,
  rabbithole,
  onRemove,
  onApply,
  state,
  size = "md",
  maxWidth,
}: IPaperRabbitholeProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (!rabbithole) return;
    if (active && onRemove) {
      onRemove(rabbithole.id.toString());
    } else if (onApply) {
      onApply(rabbithole.id.toString());
    }
  };

  const classNames = [
    styles.paperRabbithole,
    active && styles.active,
    state === "applied" && styles.applied,
    state === "suggested" && styles.suggested,
    styles[size],
  ].filter(Boolean);

  console.log("Rabbithole: ", rabbithole);

  const Icon = () => {
    return <RabbitholeIcon size={14} weight="bold" className={styles.icon} />;
  };

  return (
    <PaperContextMenu>
      <PaperContextMenu.Target>
        <button
          className={classNames.join(" ")}
          onClick={handleClick}
          style={{ maxWidth: maxWidth }}
        >
          <Icon />
          <span className={styles.label}>{rabbithole?.name}</span>
        </button>
      </PaperContextMenu.Target>
      <PaperContextMenu.Dropdown>
        {rabbithole && (
          <PaperContextMenu.Item
            icon={<ArrowRightIcon weight="bold" />}
            onClick={() => navigate(`/rabbitholes/${rabbithole.id}`)}
          >
            View rabbithole
          </PaperContextMenu.Item>
        )}
      </PaperContextMenu.Dropdown>
    </PaperContextMenu>
  );
}
