import React from "react";
import { useLayout } from "../../../contexts/LayoutContext";
import styles from "./Sidebars.module.scss";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { ActionIcon } from "@mantine/core";

interface ILeftSidebarProps {
  children: React.ReactNode | React.ReactNode[];
}

const LeftSidebar = ({ children }: ILeftSidebarProps) => {
  const {
    elements: {
      leftSidebar: {
        mode: { get: mode, set: setMode },
      },
    },
    isMobile,
  } = useLayout();

  const Global: Record<typeof mode, JSX.Element> = {
    open: (
      <div>
        <ActionIcon
          onClick={() => {
            setMode("collapsed");
          }}
          variant="light"
          size={isMobile ? "sm" : "md"}
        >
          <CaretLeftIcon />
        </ActionIcon>
      </div>
    ),
    collapsed: (
      <div>
        <ActionIcon
          onClick={() => {
            setMode("open");
          }}
          variant="light"
          size={isMobile ? "sm" : "md"}
        >
          <CaretRightIcon />
        </ActionIcon>
      </div>
    ),
    compact: <div>Tiny</div>,
  };

  const modeToClass: Record<typeof mode, string> = {
    open: styles.open,
    collapsed: styles.collapsed,
    compact: styles.compact,
  };

  return (
    <aside className={`${styles.sidebar} ${styles.left} ${modeToClass[mode]}`}>
      <div className={styles.global}>{Global[mode]}</div>
      <div className={styles.content}>{children}</div>
    </aside>
  );
};

export default LeftSidebar;

type IContentProps = {
  children: React.ReactNode | React.ReactNode[];
};

LeftSidebar.Open = ({ children }: IContentProps) => {
  const {
    elements: {
      leftSidebar: {
        mode: { get: mode },
      },
    },
  } = useLayout();
  if (mode !== "open") {
    return null;
  }
  return <div>{children}</div>;
};

LeftSidebar.Collapsed = ({ children }: IContentProps) => {
  const {
    elements: {
      leftSidebar: {
        mode: { get: mode },
      },
    },
  } = useLayout();
  if (mode !== "collapsed") {
    return null;
  }
  return <div>{children}</div>;
};

LeftSidebar.Compact = ({ children }: IContentProps) => {
  const {
    elements: {
      leftSidebar: {
        mode: { get: mode },
      },
    },
  } = useLayout();
  if (mode !== "compact") {
    return null;
  }
  return <div>{children}</div>;
};
