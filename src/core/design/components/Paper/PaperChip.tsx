import { CheckIcon } from "@phosphor-icons/react";
import styles from "./PaperChip.module.scss";

interface IPaperChipProps {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  size?: "default" | "compact";
}

export default function PaperChip({
  children,
  onClick,
  active = false,
  disabled = false,
  size = "default",
}: IPaperChipProps) {
  return (
    <button
      className={`${styles.paperChip} ${active ? styles.active : ""} ${
        disabled ? styles.disabled : ""
      } ${size === "compact" ? styles.compact : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {active && <CheckIcon weight="bold" />}
      {children}
    </button>
  );
}
