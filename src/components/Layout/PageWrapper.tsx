import { useLayout } from "../../contexts/LayoutContext";
import MobileBar from "../UI/Layout/MobileBar";
import styles from "./PageWrapper.module.scss";

type PageWrapperProps = {
  children: React.ReactNode;
};

export default function PageWrapper({ children }: PageWrapperProps) {
  const { isMobile } = useLayout();
  return (
    <div className={styles.pageWrapper}>
      {children}

      {isMobile && <MobileBar />}
    </div>
  );
}
