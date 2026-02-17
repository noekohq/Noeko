import React, { useRef, useState } from "react";
import {
  IconProps,
  DotsSixVertical,
  DotsSixVerticalIcon,
  TrashSimpleIcon,
  PersonIcon,
  UserCircleIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { useNavigate } from "react-router";
import { CopyButton, Group, Modal, Stack, Text } from "@mantine/core";
import { CopyIcon, EyeIcon, ArrowRightIcon, BrowsersIcon, CheckIcon } from "@phosphor-icons/react";
import styles from "./PaperThing.module.scss";
import { PaperContextMenu } from "../PaperContextMenu";
import { useLandscape } from "../../../../contexts/LandscapeContext";
import { IThing } from "./things";

export type IPaperThingState = "default" | "suggested";

export interface IPaperThingProps extends IThing {
  state?: IPaperThingState;
}

export default function PaperThing({
  id,
  title,
  detail,
  icon: IconComponent,
  link,
  onDelete,
  state = "default",
  onClick,
  onDoubleClick,
  preventClickDefault,
  preventDoubleClickDefault,
  action,
  artifacts,
  preview,
  draggable = false,
  thumbnail,
}: IPaperThingProps) {
  const navigate = useNavigate();
  const [hovering, setHovering] = useState(false);
  const [peering, setPeering] = useState(false);
  const [isInternallyDragging, setIsInternallyDragging] = useState(false);

  // Ref for capturing the whole row as the drag image
  const rootRef = useRef<HTMLDivElement>(null);

  const handleMainClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (link && !preventClickDefault) {
      navigate(link);
    }
    onClick?.(id, e);
  };

  const handleDoubleClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (link && !preventDoubleClickDefault) {
      navigate(link);
    }
    onDoubleClick?.(id, e);
  };

  const {
    dragging: {
      current: { set: setDragging },
    },
  } = useLandscape();

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation();

    setIsInternallyDragging(true);
    setDragging(id);

    if (rootRef.current) {
      e.dataTransfer.setDragImage(rootRef.current, 0, 0);
    }

    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        thingId: id.toString(),
      })
    );
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    setIsInternallyDragging(false);
    setDragging(null);
  };

  const rootClasses = [
    styles.paperThing,
    styles[state],
    draggable && styles.draggable,
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
            ref={rootRef}
            className={rootClasses}
            onClick={handleMainClick}
            onDoubleClick={handleDoubleClick}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleMainClick(e);
              }
            }}
            onMouseEnter={() => {
              setHovering(true);
            }}
            onMouseLeave={() => {
              setHovering(false);
            }}
            tabIndex={0}
            role="button"
          >
            <div
              className={`${styles.iconDragZone} ${hovering ? styles.hovering : ""}`}
              draggable={!!id && draggable}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onClick={(e) => e.stopPropagation()}
            >
              {thumbnail ? (
                <img
                  src={thumbnail}
                  alt={title}
                  className={styles.thumbnail}
                  style={{
                    width: 32,
                    height: 32,
                    objectFit: "cover",
                    borderRadius: 4,
                  }}
                />
              ) : IconComponent && !(draggable && hovering) ? (
                <IconComponent
                  size={16}
                  weight={state === "suggested" ? "regular" : "bold"}
                  className={styles.mainIcon}
                />
              ) : (
                // Fallback handle if no icon exists
                <DotsSixVerticalIcon size={16} weight="bold" />
              )}
            </div>

            <div className={styles.contentWrapper}>
              <Stack gap={2}>
                <Text className={styles.title} truncate="end" title={title}>
                  {title?.trim() || "Untitled"}
                </Text>
                <Text className={styles.detail} truncate="end" title={detail?.toString() || ""}>
                  {detail}
                </Text>
                {artifacts?.length &&
                  artifacts.map((a) => {
                    const Icon = a.icon;
                    return (
                      <div className={styles.artifacts}>
                        <div className={styles.artifact}>
                          <Icon weight="bold" /> {a.label}
                        </div>
                      </div>
                    );
                  })}
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
          {onDelete && (
            <PaperContextMenu.Item
              icon={<TrashSimpleIcon weight="bold" />}
              onClick={() => {
                onDelete?.();
              }}
              color="red"
            >
              Delete
            </PaperContextMenu.Item>
          )}
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
            {typeof preview === "string" ? (
              <Text size="sm" dangerouslySetInnerHTML={{ __html: preview }} />
            ) : (
              preview
            )}
          </Stack>
        </Modal>
      )}
    </>
  );
}
