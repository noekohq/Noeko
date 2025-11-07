import styles from "./PaperButton.module.scss";

interface IPaperButtonProps {
  leftSection?: React.ReactNode;
  children: React.ReactNode;
  tabIndex?: number;
  onClick?: () => void;
  withBorder?: boolean;
  fullWidth?: boolean;
}

export default function PaperButton({
  leftSection,
  children,
  tabIndex,
  onClick,
  withBorder = false,
  fullWidth = false,
}: IPaperButtonProps) {
  return (
    <button
      tabIndex={tabIndex}
      className={`${styles.paperButton} ${withBorder ? styles.withBorder : ""} ${fullWidth ? styles.fullWidth : ""}`}
      onClick={onClick}
    >
      {leftSection && <div className={styles.leftSection}>{leftSection}</div>}
      {children}
    </button>
  );
}
