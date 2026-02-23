import { MantineColor } from "@mantine/core";
import styles from "./StatusButton.module.scss";
import { forwardRef } from "react";

type IStatusButtonVariant = "default" | "primary";

interface IStatusButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  leftSection?: React.ReactNode;
  title?: string;
  style?: React.CSSProperties;
  variant?: IStatusButtonVariant;
}

const StatusButton = forwardRef<HTMLButtonElement, IStatusButtonProps>(
  ({ children, onClick, leftSection, title, style, variant }, ref) => {
    const handleClick = () => {
      onClick?.();
    };

    return (
      <button
        ref={ref}
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
);

export default StatusButton;
