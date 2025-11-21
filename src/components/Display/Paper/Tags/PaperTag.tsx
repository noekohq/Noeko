import { ArrowRightIcon, TagIcon } from "@phosphor-icons/react";
import styles from "./PaperTag.module.scss";
import { ITag } from "../../../../../app/database/models/tag";
import React from "react";
import { Text } from "@mantine/core";
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
}

export default function PaperTag({
  onClick,
  active = false,
  tag,
  onRemove,
  onApply,
  state,
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
  ].filter(Boolean);

  const Icon = () => {
    // if (state === "suggested") {
    //   return <SparkleIcon weight="bold" />;
    // }
    return <TagIcon weight="bold" />;
  };

  return (
    <PaperContextMenu>
      <PaperContextMenu.Target>
        <button className={classNames.join(" ")} onClick={handleClick}>
          <Icon />
          {tag?.name}
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
