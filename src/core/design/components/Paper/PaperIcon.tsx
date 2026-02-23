import { MantineSize } from "@mantine/core";
import styles from "./PaperIcon.module.scss";

interface IPaperIconProps {
  children: React.ReactNode; // The <Icon /> component
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  "aria-label": string; // Required for accessibility
  tabIndex?: number;
  withBorder?: boolean;
  disabled?: boolean;
  size?: MantineSize;
  className?: string;
}

export default function PaperIcon({
  children,
  onClick,
  "aria-label": ariaLabel,
  tabIndex,
  withBorder = false,
  disabled = false,
  size = "sm",
  className,
}: IPaperIconProps) {
  const classNames = [
    styles.paperIcon,
    withBorder ? styles.withBorder : "",
    styles[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classNames}
      onClick={(e) => {
        onClick?.(e);
      }}
      tabIndex={tabIndex}
      aria-label={ariaLabel}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
