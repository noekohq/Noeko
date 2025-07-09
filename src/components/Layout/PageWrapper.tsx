import { useLandscape } from "../../contexts/LandscapeContext";
import { useLayout } from "../../contexts/LayoutContext";
import { RabbitholeIndicator } from "../Display/Rabbitholes/RabbitholeIndicator";
import MobileBar from "../UI/Layout/MobileBar";
import styles from "./PageWrapper.module.scss";

type PageWrapperProps = {
  children: React.ReactNode;
};

export default function PageWrapper({ children }: PageWrapperProps) {
  const { isMobile } = useLayout();
  const {
    rabbitholes: {
      entered: { get: enteredRabbithole },
    },
  } = useLandscape();

  const hasEnteredRabbithole = enteredRabbithole !== null;

  const {
    elements: {
      leftSidebar: {
        mode: { get: leftSidebarMode },
      },
    },
  } = useLayout();

  return (
    <div
      className={`${styles.pageWrapper} ${hasEnteredRabbithole ? styles.hasRabbithole : ""}`}
    >
      {children}
      {isMobile && <MobileBar />}
      {hasEnteredRabbithole &&
        !["open", "hovering"].includes(leftSidebarMode) && (
          <div className={styles.rabbitholeIndicator}>
            <RabbitholeIndicator />
          </div>
        )}
    </div>
  );
}
