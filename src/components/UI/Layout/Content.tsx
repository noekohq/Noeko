import { useLayout } from "../../../contexts/LayoutContext";
import { extractNumberFromCSSValue } from "../../../utils/dom";
import styles from "./Content.module.scss";

interface IContentProps {
  children: React.ReactNode | React.ReactNode[];
}

const Content = ({ children }: IContentProps) => {
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

  const leftOpen = leftMode === "open";
  const rightOpen = rightMode === "open";

  const rootElement = document.documentElement;

  const computedRootStyle = window.getComputedStyle(rootElement);

  const sidebarWidth = computedRootStyle.getPropertyValue("--sidebar-width");
  const contentWidth = computedRootStyle.getPropertyValue("--content-width");

  console.log("Sidebar Width:", sidebarWidth);
  console.log("Content Width:", contentWidth);

  return <div className={styles.content}>{children}</div>;
};

export default Content;
