import { CheckIcon } from "@phosphor-icons/react";
import styles from "./PaperChip.module.scss";

interface IPaperChipProps {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}

export default function PaperChip({
  children,
  onClick,
  active = false,
}: IPaperChipProps) {
  return (
    <button
      className={`${styles.paperChip} ${active ? styles.active : ""}`}
      onClick={onClick}
    >
      {active && <CheckIcon weight="bold" />}
      {children}
    </button>
  );
}
