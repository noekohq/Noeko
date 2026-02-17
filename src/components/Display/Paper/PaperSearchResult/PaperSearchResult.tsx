import React, { useRef, useState } from "react";
import { Text, CopyButton } from "@mantine/core";
import { useNavigate } from "react-router";
import {
  ArrowRightIcon,
  BrowsersIcon,
  CheckIcon,
  CopyIcon,
  QuestionMarkIcon,
  IconProps,
} from "@phosphor-icons/react";
import { INode } from "../../../../declarations/graph";
import styles from "./PaperSearchResult.module.scss";
import Match from "../../../Utils/Match";
import { getNodeLinkFromId, IconMap } from "../../../../utils/graph";
import { useLandscape } from "../../../../contexts/LandscapeContext";
import { PaperContextMenu } from "../PaperContextMenu";

interface IPaperSearchResult {
  node: INode;
  title: string;
  snippet: string;
  onSelect?: (node: INode) => void;
  draggable?: boolean;
  artifacts?: {
    icon: React.FC<IconProps>;
    label: string;
  }[];
  actions?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactElement<IconProps>;
    disabled?: boolean;
  }[];
}

export default function PaperSearchResult({
  node,
  title,
  snippet,
  onSelect,
  draggable,
  artifacts,
  actions,
}: IPaperSearchResult) {
  const [isInternallyDragging, setIsInternallyDragging] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const link = getNodeLinkFromId(node.id.toString());

  const handleOnSelect = () => {
    onSelect?.(node);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      handleOnSelect();
    }
  };

  const {
    dragging: {
      current: { set: setDragging },
    },
  } = useLandscape();

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsInternallyDragging(true);
    setDragging(node.id.toString());

    if (rootRef.current) {
      e.dataTransfer.setDragImage(rootRef.current, 0, 0);
    }

    e.dataTransfer.setData("application/json", JSON.stringify({ thingId: node.id.toString() }));
  };

  const handleDragEnd = () => {
    setIsInternallyDragging(false);
    setDragging(null);
  };

  const IconComponent = node.type ? IconMap[node.type] : QuestionMarkIcon;

  return (
    <PaperContextMenu>
      <PaperContextMenu.Target>
        <div
          className={styles.paperSearchResult}
          onClick={handleOnSelect}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="button"
          draggable={draggable}
          ref={rootRef}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Left: Icon Anchor */}
          <div className={styles.iconZone}>
            <IconComponent size={18} weight="bold" />
          </div>

          {/* Right: Stacked Content */}
          <div className={styles.contentWrapper}>
            {/* Row 1: Title (Full Width) */}
            <div className={styles.header}>
              <Text className={styles.title} truncate lineClamp={1}>
                {title}
              </Text>
            </div>

            {/* Row 2: Snippet */}
            <div className={styles.snippet}>
              <Text size="xs" c="dimmed" truncate="end" lineClamp={2} style={{ lineHeight: 1.4 }}>
                <Match
                  opener="->"
                  closer="<-"
                  match={(text) => (
                    <Text
                      component="span"
                      c="black"
                      bg="highlight.6"
                      style={{ borderRadius: "2px", padding: "0 2px" }}
                    >
                      {text}
                    </Text>
                  )}
                >
                  {snippet}
                </Match>
              </Text>
            </div>

            {artifacts && artifacts.length > 0 && (
              <div className={styles.artifacts}>
                {artifacts.map((a, idx) => {
                  const Icon = a.icon;
                  return (
                    <div key={idx} className={styles.artifact}>
                      <Icon weight="fill" size={12} />
                      <Text size="xs">{a.label}</Text>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </PaperContextMenu.Target>
      <PaperContextMenu.Dropdown>
        <PaperContextMenu.Detail label="Title" valueToCopy={title}>
          {title}
        </PaperContextMenu.Detail>
        <PaperContextMenu.Label>Actions</PaperContextMenu.Label>
        {actions &&
          actions.map((action, idx) => (
            <PaperContextMenu.Item
              key={idx}
              icon={action.icon}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.label}
            </PaperContextMenu.Item>
          ))}
        <PaperContextMenu.Item icon={<ArrowRightIcon weight="bold" />} onClick={handleOnSelect}>
          Open
        </PaperContextMenu.Item>
        <PaperContextMenu.Item
          icon={<BrowsersIcon weight="bold" />}
          onClick={() => {
            window.open(link, "_blank");
          }}
        >
          Open in new tab
        </PaperContextMenu.Item>
        <CopyButton value={title}>
          {({ copy, copied }) => (
            <PaperContextMenu.Item icon={copied ? <CheckIcon /> : <CopyIcon />} onClick={copy}>
              Copy title
            </PaperContextMenu.Item>
          )}
        </CopyButton>
        <CopyButton value={node.id.toString()}>
          {({ copy, copied }) => (
            <PaperContextMenu.Item icon={copied ? <CheckIcon /> : <CopyIcon />} onClick={copy}>
              Copy ID
            </PaperContextMenu.Item>
          )}
        </CopyButton>
      </PaperContextMenu.Dropdown>
    </PaperContextMenu>
  );
}
