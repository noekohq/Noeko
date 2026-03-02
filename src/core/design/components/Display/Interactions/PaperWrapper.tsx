import styles from "./PaperWrapper.module.scss";

interface IPaperWrapperProps {
  children: React.ReactNode;
}

export default function PaperWrapper({ children }: IPaperWrapperProps) {
  return <div className={styles.paperWrapper}>{children}</div>;
}
