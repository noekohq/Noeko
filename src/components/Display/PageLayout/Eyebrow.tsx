import styles from "./Eyebrow.module.scss";

interface IEyebrowProps {
  children: React.ReactNode;
}

export default function Eyebrow({ children }: IEyebrowProps) {
  return <div className={styles.eyebrow}>{children}</div>;
}
