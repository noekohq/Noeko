import styles from "./ProgressBar.module.scss";

interface IProgressBarProps {
  progress: number;
}

export default function ProgressBar({ progress }: IProgressBarProps) {
  const normalizedProgress = Math.min(Math.max(progress, 0), 100);
  const width = `${normalizedProgress}%`;

  return (
    <div className={styles.container}>
      <div style={{ width }} className={styles.bar} />
    </div>
  );
}
