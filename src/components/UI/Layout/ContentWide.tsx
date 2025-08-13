import { useEffect, useRef } from "react";
import { useLayout } from "../../../contexts/LayoutContext";
import styles from "./ContentWide.module.scss";
import useScroll from "../../../hooks/useScroll";

interface IContentWideProps {
  children: React.ReactNode | React.ReactNode[];
}

const ContentWide = ({ children }: IContentWideProps) => {
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

  return (
    <div
      className={`${styles.contentWide}`}
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

export default ContentWide;
