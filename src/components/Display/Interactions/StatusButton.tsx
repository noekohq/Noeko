import styles from "./StatusButton.module.scss";

interface IStatusButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  leftSection?: React.ReactNode;
  title?: string;
  style?: React.CSSProperties;
}

export default function StatusButton({
  children,
  onClick,
  leftSection,
  title,
  style,
}: IStatusButtonProps) {
  const handleClick = () => {
    onClick?.();
  };

  return (
    <button
      className={styles.statusButton}
      onClick={handleClick}
      title={title}
      style={style}
    >
      {leftSection && <div className={styles.left}>{leftSection}</div>}
      <div className={styles.content}>{children}</div>
    </button>
  );
}
