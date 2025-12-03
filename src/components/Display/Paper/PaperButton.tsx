import { MantineColor, MantineSize } from "@mantine/core";
import styles from "./PaperButton.module.scss";

interface IPaperButtonProps {
  leftSection?: React.ReactNode;
  children: React.ReactNode;
  tabIndex?: number;
  onClick?: () => void;
  withBorder?: boolean;
  fullWidth?: boolean;
  size?: MantineSize;
}

export default function PaperButton({
  leftSection,
  children,
  tabIndex,
  onClick,
  withBorder = false,
  fullWidth = false,
  size = "md",
}: IPaperButtonProps) {
  const classNames: string[] = [
    styles.paperButton,
    withBorder ? styles.withBorder : "",
    fullWidth ? styles.fullWidth : "",
    styles[size],
  ].filter((c) => !!c);

  return (
    <button
      tabIndex={tabIndex}
      className={classNames.join(" ")}
      onClick={onClick}
    >
      {leftSection && <div className={styles.leftSection}>{leftSection}</div>}
      {children}
    </button>
  );
}
