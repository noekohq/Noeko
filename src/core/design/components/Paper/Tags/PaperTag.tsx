import { ArrowRightIcon, TagIcon } from "@phosphor-icons/react";
import styles from "./PaperTag.module.scss";
import { ITag } from "../../../../../../shared/types/tags";
import React from "react";
import { MantineSize, Text } from "@mantine/core";
import { PaperContextMenu } from "../PaperContextMenu";
import { useNavigate } from "react-router";

export type ITagState = "applied" | "suggested" | "display";

interface IPaperTagProps {
  onClick?: () => void;
  active?: boolean;
  tag?: ITag;
  onRemove?: (tagId: string) => void;
  onApply?: (tagId: string) => void;
  state: ITagState;
  size?: MantineSize;
  maxWidth?: string | number;
}

export default function PaperTag({
  onClick,
  active = false,
  tag,
  onRemove,
  onApply,
  state,
  size = "md",
  maxWidth,
}: IPaperTagProps) {
  const navigate = useNavigate();
  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (!tag) return;
    if (active && onRemove) {
      onRemove(tag.id.toString());
    } else if (onApply) {
      onApply(tag.id.toString());
    }
  };

  const classNames = [
    styles.paperTag,
    active && styles.active,
    state === "applied" && styles.applied,
    state === "suggested" && styles.suggested,
    styles[size],
  ].filter(Boolean);

  const Icon = () => {
    // Note: added class name for flex shrinking control
    return <TagIcon weight="bold" className={styles.icon} />;
  };

  return (
    <PaperContextMenu>
      <PaperContextMenu.Target>
        <button
          className={classNames.join(" ")}
          onClick={handleClick}
          style={{ maxWidth: maxWidth }}
        >
          <Icon />
          <span className={styles.label}>{tag?.name}</span>
        </button>
      </PaperContextMenu.Target>
      <PaperContextMenu.Dropdown>
        {tag && (
          <>
            <PaperContextMenu.Item
              icon={<ArrowRightIcon weight="bold" />}
              onClick={() => navigate(`/tags/${tag.id}`)}
            >
              View tag
            </PaperContextMenu.Item>
            {tag.description ? (
              <>
                <PaperContextMenu.Label>Description</PaperContextMenu.Label>
                <div
                  style={{
                    padding: "var(--mantine-spacing-xs)",
                    maxWidth: 300,
                    whiteSpace: "normal",
                  }}
                >
                  <Text size="sm">{tag.description}</Text>
                </div>
              </>
            ) : (
              <PaperContextMenu.Label>No description</PaperContextMenu.Label>
            )}
          </>
        )}
      </PaperContextMenu.Dropdown>
    </PaperContextMenu>
  );
}
