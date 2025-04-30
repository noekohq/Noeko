import styles from "./PageWrapper.module.scss";

type PageWrapperProps = {
  children: React.ReactNode;
};

export default function PageWrapper({ children }: PageWrapperProps) {
  return <div className={styles.pageWrapper}>{children}</div>;
}
