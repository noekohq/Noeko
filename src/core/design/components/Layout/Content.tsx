import { useRef } from "react";
import { useLayoutSidebarActions, useLayoutViewport } from "@/contexts/LayoutContext";
import styles from "./Content.module.scss";

interface IContentProps {
  children: React.ReactNode | React.ReactNode[];
}

const Content = ({ children }: IContentProps) => {
  const { isMobile } = useLayoutViewport();
  const { setLeftSidebarMode, setRightSidebarMode } = useLayoutSidebarActions();

  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={`${styles.content}`}
      onClick={() => {
        if (isMobile) {
          setLeftSidebarMode("collapsed");
          setRightSidebarMode("collapsed");
        }
      }}
      ref={contentRef}
    >
      {children}
    </div>
  );
};

export default Content;
