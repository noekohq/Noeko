import { useRef } from "react";
import { useLandscape } from "../../contexts/LandscapeContext";
import { useLayout } from "../../contexts/LayoutContext";
import MobileBar from "../UI/Layout/MobileBar";
import styles from "./PageWrapper.module.scss";
import useScroll from "../../hooks/useScroll";
import { useAuth } from "../../contexts/AuthContext";

type PageWrapperProps = {
  children: React.ReactNode;
};

export default function PageWrapper({ children }: PageWrapperProps) {
  const {
    isMobile,
    elements: {
      leftSidebar: {
        mode: { get: leftMode },
      },
      rightSidebar: {
        mode: { get: rightMode },
      },
    },
  } = useLayout();
  const { user } = useAuth();

  const wrapperRef = useRef<HTMLDivElement>(null);

  const {
    rabbitholes: {
      entered: { get: enteredRabbithole },
    },
  } = useLandscape();
  useScroll({ ref: wrapperRef });

  const hasEnteredRabbithole = enteredRabbithole !== null;

  const leftModeToClass: Record<typeof leftMode, string> = {
    open: styles.leftOpen,
    collapsed: styles.leftCollapsed,
    compact: styles.leftCompact,
    hovering: `${styles.leftOpen} ${styles.leftHovering}`,
  };

  const rightModeToClass: Record<typeof rightMode, string> = {
    open: styles.rightOpen,
    collapsed: styles.rightCollapsed,
    compact: styles.rightCompact,
    hovering: `${styles.rightOpen} ${styles.rightHovering}`,
  };

  const leftModeClass = leftModeToClass[leftMode];
  const rightModeClass = rightModeToClass[rightMode];

  const showMobileBar = () => {
    if (user?.settings.isNew) {
      return false;
    }
    return true;
  };

  return (
    <div
      className={`${styles.pageWrapper} ${hasEnteredRabbithole ? styles.hasRabbithole : ""} ${leftModeClass} ${rightModeClass}`}
      ref={wrapperRef}
    >
      {children}
      {isMobile && showMobileBar() && <MobileBar />}
    </div>
  );
}
