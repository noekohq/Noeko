import { MantineColor } from "@mantine/core";
import styles from "./StatusButton.module.scss";

type IStatusButtonVariant = "default" | "primary";

interface IStatusButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  leftSection?: React.ReactNode;
  title?: string;
  style?: React.CSSProperties;
  variant?: IStatusButtonVariant;
}

export default function StatusButton({
  children,
  onClick,
  leftSection,
  title,
  style,
  variant,
}: IStatusButtonProps) {
  const handleClick = () => {
    onClick?.();
  };

  return (
    <button
      className={`${styles.statusButton} ${styles[variant ?? "default"]}`}
      onClick={handleClick}
      title={title}
      style={style}
    >
      {leftSection && <div className={styles.left}>{leftSection}</div>}
      <div className={styles.content}>{children}</div>
    </button>
  );
}
