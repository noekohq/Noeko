import { useEffect, useRef } from "react";
import { useLayout } from "../../../contexts/LayoutContext";
import styles from "./Content.module.scss";
import useScroll from "../../../hooks/useScroll";

interface IContentProps {
  children: React.ReactNode | React.ReactNode[];
}

const Content = ({ children }: IContentProps) => {
  const {
    elements: {
      leftSidebar: {
        mode: { get: leftMode, set: setLeftMode },
      },
      rightSidebar: {
        mode: { get: rightMode, set: setRightMode },
      },
    },
    isMobile,
  } = useLayout();

  const contentRef = useRef<HTMLDivElement>(null);
  useScroll({ ref: contentRef });

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
      className={`${styles.content} ${leftModeClass} ${rightModeClass}`}
      onClick={() => {
        if (isMobile) {
          setLeftMode("collapsed");
          setRightMode("collapsed");
        }
      }}
      ref={contentRef}
    >
      {children}
    </div>
  );
};

export default Content;
