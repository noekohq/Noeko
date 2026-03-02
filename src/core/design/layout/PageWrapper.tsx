import { useEffect, useRef } from "react";
import { useLayout } from "../../../contexts/LayoutContext";
import styles from "./PageWrapper.module.scss";
import { useAuth } from "@/domains/identity";
import { useLandscape } from "../../../contexts/LandscapeContext";

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
    scroll: { setScrollableElement },
  } = useLayout();
  const { user } = useAuth();

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (wrapperRef.current) {
      setScrollableElement(wrapperRef.current);
    }
    return () => {
      setScrollableElement(null);
    };
  }, []);

  const {
    rabbitholes: {
      entered: { get: enteredRabbithole },
    },
  } = useLandscape();

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
      {/*{isMobile && showMobileBar() && <MobileBar />}*/}
    </div>
  );
}
