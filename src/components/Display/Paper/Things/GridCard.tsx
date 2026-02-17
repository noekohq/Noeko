import React, { useRef, useState } from "react";
import {
  ArrowUpRightIcon,
  DotsSixVertical,
  DotsSixVerticalIcon,
  IconProps,
} from "@phosphor-icons/react";
import { useNavigate } from "react-router";
import { CopyButton, Modal, Stack, Text, Box } from "@mantine/core";
import {
  CopyIcon,
  EyeIcon,
  ArrowRightIcon,
  ArrowUpRight, // New import for the CTA
  BrowsersIcon,
  CheckIcon,
} from "@phosphor-icons/react";
import styles from "./GridCard.module.scss";
import { PaperContextMenu } from "../PaperContextMenu";
import { useLandscape } from "../../../../contexts/LandscapeContext";
import { IThing } from "./things";

export type ICardState = "default" | "suggested";

export interface IGridCardProps extends IThing {
  state?: ICardState;
  footerContent?: React.ReactNode;
}

export default function GridCard({
  id,
  title,
  detail,
  icon: IconComponent,
  link,
  state = "default",
  onClick,
  onDoubleClick,
  preventClickDefault,
  preventDoubleClickDefault,
  action,
  artifacts,
  preview,
  draggable = false,
  footerContent,
  thumbnail,
}: IGridCardProps) {
  const navigate = useNavigate();
  const [hovering, setHovering] = useState(false);
  const [peering, setPeering] = useState(false);
  const [isInternallyDragging, setIsInternallyDragging] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);

  const handleMainClick = (e: React.MouseEvent) => {
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

    e.dataTransfer.setData("application/json", JSON.stringify({ thingId: id.toString() }));
  };

  const handleDragEnd = () => {
    setIsInternallyDragging(false);
    setDragging(null);
  };

  const rootClasses = [
    styles.gridCard,
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
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            tabIndex={0}
            role="button"
          >
            {/* ROW 1: Icon (Left) + CTA (Right) */}
            <div className={styles.topRow}>
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
                      width: "100%",
                      height: 120,
                      objectFit: "cover",
                      borderRadius: "var(--mantine-radius-sm)",
                      marginBottom: "var(--mantine-spacing-xs)",
                    }}
                  />
                ) : IconComponent ? (
                  <IconComponent
                    size={18}
                    weight={state === "suggested" ? "regular" : "bold"}
                    className={styles.mainIcon}
                  />
                ) : (
                  <DotsSixVerticalIcon size={20} weight="bold" />
                )}
              </div>

              {/* Visual indicator that this card is clickable/navigable */}
              <div className={styles.ctaIcon}>
                <ArrowUpRightIcon size={16} weight="bold" />
              </div>
            </div>

            {/* ROW 2: Title */}
            <Text lineClamp={1} fw="bold" size="md" title={title} w={"100%"}>
              {title?.trim() || "Untitled"}
            </Text>

            {/* ROW 3: Content Detail */}
            <div className={styles.contentWrapper}>
              <Text className={styles.detail} lineClamp={3} title={detail?.toString() || ""}>
                {detail}
              </Text>
            </div>

            {/* Artifacts */}
            {artifacts && artifacts.length > 0 && (
              <div className={styles.artifacts}>
                {artifacts.map((a, idx) => {
                  const Icon = a.icon;
                  return (
                    <div key={idx} className={styles.artifact}>
                      <Icon weight="bold" size={12} />
                      <Text size="xs" c="dimmed">
                        {a.label}
                      </Text>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Additional footer content */}
            {footerContent && <div className={styles.footerContent}>{footerContent}</div>}

            {/* ROW 4: Footer Actions (Floating bottom right) */}
            {action && (
              <div className={styles.footer}>
                <Box style={{ flex: 1 }} />
                <button
                  className={styles.actionButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick(id, e);
                  }}
                  title={action.tooltip}
                >
                  <action.icon weight="bold" size={14} />
                </button>
              </div>
            )}
          </div>
        </PaperContextMenu.Target>

        {/* Context Menu (Unchanged) */}
        <PaperContextMenu.Dropdown>
          <PaperContextMenu.Detail label="Title" valueToCopy={title}>
            {title}
          </PaperContextMenu.Detail>
          <PaperContextMenu.Label>Actions</PaperContextMenu.Label>
          {link && (
            <>
              <PaperContextMenu.Item
                icon={<ArrowRightIcon weight="bold" />}
                onClick={() => navigate(link)}
              >
                Open
              </PaperContextMenu.Item>
              <PaperContextMenu.Item
                icon={<BrowsersIcon weight="bold" />}
                onClick={() => window.open(link, "_blank")}
              >
                Open in new tab
              </PaperContextMenu.Item>
            </>
          )}
          <CopyButton value={title}>
            {({ copy, copied }) => (
              <PaperContextMenu.Item icon={copied ? <CheckIcon /> : <CopyIcon />} onClick={copy}>
                Copy title
              </PaperContextMenu.Item>
            )}
          </CopyButton>
          <PaperContextMenu.Item icon={<EyeIcon />} onClick={() => setPeering(true)}>
            Preview
          </PaperContextMenu.Item>
        </PaperContextMenu.Dropdown>
      </PaperContextMenu>

      {/* Modal (Unchanged) */}
      {preview && (
        <Modal
          opened={peering}
          onClose={() => setPeering(false)}
          title={<Text size="sm">Peering at {title}</Text>}
          onClick={(e) => e.stopPropagation()}
          size="lg"
        >
          <Stack py="lg" gap="xs">
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              Preview
            </Text>
            {typeof preview === "string" ? (
              <Text
                size="sm"
                dangerouslySetInnerHTML={{ __html: preview }}
                style={{
                  maxHeight: "150px",
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 7,
                  WebkitBoxOrient: "vertical",
                }}
              />
            ) : (
              preview
            )}
          </Stack>
        </Modal>
      )}
    </>
  );
}
