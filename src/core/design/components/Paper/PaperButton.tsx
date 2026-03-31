import { MantineSize, Loader } from "@mantine/core";
import styles from "./PaperButton.module.scss";

interface IPaperButtonProps {
  leftSection?: React.ReactNode;
  children: React.ReactNode;
  tabIndex?: number;
  onClick?: () => void;
  withBorder?: boolean;
  fullWidth?: boolean;
  size?: MantineSize;
  variant?: "default" | "danger" | "light";
  loading?: boolean;
  disabled?: boolean;
}

export default function PaperButton({
  leftSection,
  children,
  tabIndex,
  onClick,
  withBorder = false,
  fullWidth = false,
  size = "md",
  variant = "default",
  loading = false,
  disabled = false,
}: IPaperButtonProps) {
  const classNames: string[] = [
    styles.paperButton,
    withBorder ? styles.withBorder : "",
    fullWidth ? styles.fullWidth : "",
    styles[size],
    styles[variant],
    loading || disabled ? styles.disabled : "",
  ].filter((c) => !!c);

  return (
    <button
      tabIndex={tabIndex}
      className={classNames.join(" ")}
      onClick={!loading && !disabled ? onClick : undefined}
      disabled={disabled || loading}
    >
      {loading ? (
        <div className={styles.leftSection}>
          <Loader size="xs" color="currentColor" />
        </div>
      ) : (
        leftSection && <div className={styles.leftSection}>{leftSection}</div>
      )}
      {children}
    </button>
  );
}
