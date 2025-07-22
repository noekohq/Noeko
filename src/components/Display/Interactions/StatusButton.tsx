import styles from "./StatusButton.module.scss";

interface IStatusButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  leftSection?: React.ReactNode;
}

export default function StatusButton({
  children,
  onClick,
  leftSection,
}: IStatusButtonProps) {
  const handleClick = () => {
    onClick?.();
  };

  return (
    <button className={styles.statusButton} onClick={handleClick}>
      {leftSection && <div className={styles.left}>{leftSection}</div>}
      <div className={styles.content}>{children}</div>
    </button>
  );
}
