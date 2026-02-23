import { useEffect, useRef } from "react";
import { useLayout } from '@/contexts/LayoutContext';
import styles from "./Content.module.scss";

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

  return (
    <div
      className={`${styles.content}`}
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
