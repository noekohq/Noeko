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

  console.log("Left mode: ", leftMode);
  console.log("Right mode: ", rightMode);

  const leftModeToClass: Record<typeof leftMode, string> = {
    open: styles.leftOpen,
    collapsed: styles.leftCollapsed,
    compact: styles.leftCompact,
  };

  const rightModeToClass: Record<typeof rightMode, string> = {
    open: styles.rightOpen,
    collapsed: styles.rightCollapsed,
    compact: styles.rightCompact,
  };

  const leftModeClass = leftModeToClass[leftMode];
  const rightModeClass = rightModeToClass[rightMode];

  console.log("Left class: ", leftModeClass);
  console.log("Right class: ", rightModeClass);

  return (
    <div className={`${styles.content} ${leftModeClass} ${rightModeClass}`}>
      {children}
    </div>
  );
};

export default Content;
