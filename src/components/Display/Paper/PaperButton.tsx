import styles from "./PaperButton.module.scss";

interface IPaperButtonProps {
  leftSection?: React.ReactNode;
  children: React.ReactNode;
  tabIndex?: number;
  onClick?: () => void;
}

export default function PaperButton({
  leftSection,
  children,
  tabIndex,
  onClick,
}: IPaperButtonProps) {
  return (
    <button
      tabIndex={tabIndex}
      className={styles.paperButton}
      onClick={onClick}
    >
      {leftSection && <div className={styles.leftSection}>{leftSection}</div>}
      {children}
    </button>
  );
}
