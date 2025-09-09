import React from "react";
import { IStatusBarMode, useLayout } from "../../../contexts/LayoutContext";
import styles from "./Bottom.module.scss";
import { useInteraction } from "../../../contexts/InteractionContext";
import useRabbithole from "../../../hooks/useRabbithole";
import { ActionIcon, Group, MantineColor, Menu, Popover } from "@mantine/core";
import { RabbitholeIndicator } from "../../Display/Rabbitholes/RabbitholeIndicator";
import { ConstellationIcon, SpyglassIcon } from "../../Utils/Icons/Icons";
import StatusButton from "../../Display/Interactions/StatusButton";
import {
  CalendarBlankIcon,
  DotsThreeVerticalIcon,
  FileTextIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import CreateButton from "../../Display/Interactions/CreateButton";
import { Link } from "react-router";

interface IBottomProps {
  children?: React.ReactNode | React.ReactNode[];
  topLevel?: { [key in IStatusBarMode]?: React.ReactNode | React.ReactNode[] };
}

const StatusBar = ({ children, topLevel }: IBottomProps) => {
  const {
    elements: {
      statusBar: {
        mode: { get: mode, set: setMode, toggle: toggleMode },
      },
      leftSidebar: {
        mode: { get: leftMode, set: setLeftMode },
      },
      rightSidebar: {
        mode: { get: rightMode, set: setRightMode },
      },
    },
    isMobile,
  } = useLayout();

  const { isDownRabbithole, currentRabbithole } = useRabbithole();

  const {
    actions: {
      feedback: { openFeedbackModal },
    },
    views: { spyglass, graph, tasks, sources },
    state: {
      zen: { get: isZen },
    },
  } = useInteraction();

  const defaultColor: MantineColor = "dark.3";

  const Global = <Group>{isDownRabbithole && <RabbitholeIndicator />}</Group>;

  const modeToClass: Record<typeof mode, string> = {
    showing: styles.showing,
    hidden: styles.hidden,
  };

  const showGlobal = isDownRabbithole;

  const hasChildren = !!React.Children.count(children);

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

  if (isZen) {
    return null;
  }

  return (
    <div
      className={`${styles.bottom} ${modeToClass[mode]} ${hasChildren ? styles.hasChildren : styles.noChildren} ${leftModeClass} ${rightModeClass} ${isZen ? styles.zen : ""}`}
    >
      {hasChildren && <div className={styles.content}>{children}</div>}
      <div
        className={`${styles.global} ${hasChildren ? styles.hasChildren : styles.noChildren}`}
      >
        {isMobile ? (
          <Menu position="top" withArrow radius="md" width={"200px"}>
            <Menu.Target>
              <div style={{ height: "100%" }}>
                <StatusButton>
                  <DotsThreeVerticalIcon weight="bold" size={16} />
                </StatusButton>
              </div>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<FileTextIcon weight="bold" size={16} />}
                onClick={() => {
                  sources();
                }}
              >
                Sources
              </Menu.Item>
              <Menu.Item
                leftSection={<CalendarBlankIcon weight="bold" size={16} />}
                onClick={() => {
                  tasks();
                }}
              >
                Tasks
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        ) : (
          <>
            <StatusBar.Item>
              <StatusButton
                title="Sources"
                onClick={() => {
                  sources();
                }}
              >
                <FileTextIcon weight="bold" size={16} />
              </StatusButton>
            </StatusBar.Item>
            <StatusBar.Item>
              <StatusButton
                title="Agenda"
                onClick={() => {
                  tasks();
                }}
              >
                <CalendarBlankIcon weight="bold" size={16} />
              </StatusButton>
            </StatusBar.Item>
          </>
        )}
        <StatusBar.Item>
          <StatusButton
            title="Constellation"
            onClick={() => {
              graph();
            }}
          >
            <ConstellationIcon weight="bold" size={16} />
          </StatusButton>
        </StatusBar.Item>
        <StatusBar.Item>
          <RabbitholeIndicator />
        </StatusBar.Item>
        <StatusBar.Item>
          <StatusButton
            onClick={() => {
              spyglass();
            }}
            title="Spyglass"
          >
            <SpyglassIcon size={16} />
          </StatusButton>
        </StatusBar.Item>
        <StatusBar.Item>
          <CreateButton />
        </StatusBar.Item>
      </div>
    </div>
  );
};

export default StatusBar;

type IContentProps = {
  children: React.ReactNode | React.ReactNode[];
};

StatusBar.Showing = ({ children }: IContentProps) => {
  const {
    elements: {
      statusBar: {
        mode: { get: mode },
      },
    },
  } = useLayout();
  if (!["showing"].includes(mode)) {
    return null;
  }
  return children;
};

StatusBar.Item = ({ children }: IContentProps) => {
  return <div className={styles.item}>{children}</div>;
};

StatusBar.Pill = ({ children }: IContentProps) => {
  return <div className={styles.pill}>{children}</div>;
};
