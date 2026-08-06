import { useEffect, useRef } from "react";
import { useLayout, useLayoutScrollRegistration } from "../../../contexts/LayoutContext";
import styles from "./PageWrapper.module.scss";
import { useLandscape } from "../../../contexts/LandscapeContext";

type PageWrapperProps = {
  children: React.ReactNode;
};

export default function PageWrapper({ children }: PageWrapperProps) {
  const {
    elements: {
      leftSidebar: {
        mode: { get: leftMode },
      },
      rightSidebar: {
        mode: { get: rightMode },
      },
    },
  } = useLayout();
  const { setScrollableElement } = useLayoutScrollRegistration();
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

  return (
    <div
      className={`${styles.pageWrapper} ${hasEnteredRabbithole ? styles.hasRabbithole : ""} ${leftModeClass} ${rightModeClass}`}
      ref={wrapperRef}
    >
      {children}
    </div>
  );
}
