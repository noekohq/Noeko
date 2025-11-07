import styles from "./PaperIcon.module.scss";

interface IPaperIconProps {
  children: React.ReactNode; // The <Icon /> component
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  "aria-label": string; // Required for accessibility
  tabIndex?: number;
  withBorder?: boolean;
}

export default function PaperIcon({
  children,
  onClick,
  "aria-label": ariaLabel,
  tabIndex,
  withBorder = false,
}: IPaperIconProps) {
  const classNames = [styles.paperIcon, withBorder ? styles.withBorder : ""]
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
    >
      {children}
    </button>
  );
}
