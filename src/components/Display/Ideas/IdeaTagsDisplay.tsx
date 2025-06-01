import React from "react";
import { Group, Badge, Tooltip } from "@mantine/core";
import type { IdeaTag } from "./IdeaCardTypes";
import styles from "./IdeaCards.module.scss";

interface IdeaTagsDisplayProps {
  tags: IdeaTag[];
  visibleCount?: number;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string; // For individual badge
  groupClassName?: string; // For the <Group> wrapper
}

export function IdeaTagsDisplay({
  tags,
  visibleCount = Infinity,
  size = "sm",
  className,
  groupClassName,
}: IdeaTagsDisplayProps) {
  if (!tags || tags.length === 0) {
    return null;
  }
  const displayedTags = tags.slice(0, visibleCount);

  return (
    <Group gap={size === "xs" ? 4 : "xs"} className={groupClassName}>
      {displayedTags.map((tag) => (
        <Tooltip
          key={tag.id}
          label={tag.label}
          withArrow
          openDelay={300}
          disabled={tag.label.length < 15}
        >
          <Badge
            variant={tag.variant || "light"}
            color={tag.color || "blue"}
            leftSection={
              tag.icon
                ? React.cloneElement(tag.icon, {
                    size: size === "xs" ? 12 : 14,
                  })
                : undefined
            }
            size={size}
            className={`${styles.tagBadge} ${className || ""}`}
            maw={size === "xs" ? 80 : 150} // Max width for badges
          >
            {tag.label}
          </Badge>
        </Tooltip>
      ))}
      {tags.length > visibleCount && (
        <Badge variant="outline" color="gray" size={size}>
          +{tags.length - visibleCount}
        </Badge>
      )}
    </Group>
  );
}
