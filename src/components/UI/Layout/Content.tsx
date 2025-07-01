import { useLayout } from "../../../contexts/LayoutContext";
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
    <div className={`${styles.content} ${leftModeClass} ${rightModeClass}`}>
      {children}
    </div>
  );
};

export default Content;
