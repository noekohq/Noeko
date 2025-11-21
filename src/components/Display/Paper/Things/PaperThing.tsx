import React, { useState } from "react";
import {
  Icon,
  IconProps,
  Eye,
  EyeIcon,
  ArrowRightIcon,
  BrowsersIcon,
  CopyIcon,
  CheckIcon,
} from "@phosphor-icons/react";
import { useNavigate } from "react-router";
import { Box, CopyButton, Divider, Modal, Stack, Text } from "@mantine/core";
import styles from "./PaperThing.module.scss";
import { PaperContextMenu } from "../PaperContextMenu";
import { useLandscape } from "../../../../contexts/LandscapeContext";

export type IPaperThingState = "default" | "suggested";

export interface IPaperThingProps {
  id: string;
  title: string;
  detail: string | React.ReactNode;
  icon?: React.FC<IconProps>; // Typed correctly for Phosphor
  link?: string;
  state?: IPaperThingState;
  onClick?: (id: string, e: React.MouseEvent) => void;

  // The action on the right side (e.g., the "+" button)
  action?: {
    icon: React.FC<IconProps>;
    tooltip: string;
    onClick: (id: string, e: React.MouseEvent) => void;
  };

  // The hover card content
  preview?: {
    content: string;
  };
}

export default function PaperThing({
  id,
  title,
  detail,
  icon: IconComponent,
  link,
  state = "default",
  onClick,
  action,
  preview,
}: IPaperThingProps) {
  const navigate = useNavigate();
  const [hovering, setHovering] = useState(false);
  const [peering, setPeering] = useState(false);
  const [isInternallyDragging, setIsInternallyDragging] = useState(false);

  const handleMainClick = (e: React.MouseEvent) => {
    if (link) {
      navigate(link);
    }
  };

  const {
    dragging: {
      current: { set: setDragging },
    },
  } = useLandscape();
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    setIsInternallyDragging(true);
    setDragging(id);
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        thingId: id.toString(),
      }),
    );
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    setIsInternallyDragging(false);
    setDragging(null);
  };

  const rootClasses = [
    styles.paperThing,
    styles[state],
    hovering && styles.hovering,
    isInternallyDragging && styles.dragging,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <PaperContextMenu>
        <PaperContextMenu.Target>
          <div
            className={rootClasses}
            onClick={handleMainClick}
            onMouseEnter={() => {
              setHovering(true);
            }}
            onMouseLeave={() => {
              setHovering(false);
            }}
            draggable={!!id}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            tabIndex={0}
            role="button"
          >
            <div
              className={`${styles.iconWrapper} ${
                hovering ? styles.hovering : ""
              }`}
            >
              {IconComponent && (
                <IconComponent
                  size={16}
                  weight={state === "suggested" ? "regular" : "bold"}
                  className={styles.mainIcon}
                />
              )}
            </div>

            <div className={styles.contentWrapper}>
              <Stack gap={2}>
                <Text className={styles.title} truncate="end" title={title}>
                  {title.trim() || "Untitled"}
                </Text>
                <Text
                  className={styles.detail}
                  truncate="end"
                  title={detail?.toString() || ""}
                >
                  {detail}
                </Text>
              </Stack>
            </div>

            <div className={styles.actionWrapper}>
              {action && (
                <button
                  className={styles.actionButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick(id, e);
                  }}
                  title={action.tooltip}
                >
                  <action.icon weight="bold" />
                </button>
              )}
            </div>
          </div>
        </PaperContextMenu.Target>
        <PaperContextMenu.Dropdown>
          <PaperContextMenu.Detail label="Title" valueToCopy={title}>
            {title}
          </PaperContextMenu.Detail>
          <PaperContextMenu.Label>Actions</PaperContextMenu.Label>
          {link && (
            <>
              <PaperContextMenu.Item
                icon={<ArrowRightIcon weight="bold" />}
                onClick={() => {
                  navigate(link);
                }}
              >
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
            </>
          )}
          <CopyButton value={title}>
            {({ copy, copied }) => {
              return (
                <PaperContextMenu.Item
                  icon={copied ? <CheckIcon /> : <CopyIcon />}
                  onClick={() => {
                    copy();
                  }}
                >
                  Copy title
                </PaperContextMenu.Item>
              );
            }}
          </CopyButton>
          <PaperContextMenu.Item
            icon={<EyeIcon />}
            onClick={() => {
              setPeering(true);
            }}
          >
            Preview
          </PaperContextMenu.Item>
        </PaperContextMenu.Dropdown>
      </PaperContextMenu>
      {preview && (
        <Modal
          opened={peering}
          onClose={() => {
            setPeering(false);
          }}
          title={<Text size="sm">Peering at {title}</Text>}
          onClick={(e) => {
            e.stopPropagation();
          }}
          size="lg"
        >
          <Stack py="lg" gap="xs">
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              Preview
            </Text>
            <Text
              size="sm"
              dangerouslySetInnerHTML={{ __html: preview.content }}
              style={{
                maxHeight: "150px",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 7,
                WebkitBoxOrient: "vertical",
              }}
            />
          </Stack>
        </Modal>
      )}
    </>
  );
}
