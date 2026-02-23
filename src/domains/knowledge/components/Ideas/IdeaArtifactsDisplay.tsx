import React from "react";
import { Group, Text, Tooltip } from "@mantine/core";
import type { IdeaArtifact } from "./IdeaCardTypes";
import styles from "./IdeaCards.module.scss";

interface IdeaArtifactsDisplayProps {
  artifacts: IdeaArtifact[];
  visibleCount?: number;
  size?: "xs" | "sm";
  className?: string; // For individual artifact text
  groupClassName?: string; // For the <Group> wrapper
}

export function IdeaArtifactsDisplay({
  artifacts,
  visibleCount = Infinity,
  size = "xs",
  className,
  groupClassName,
}: IdeaArtifactsDisplayProps) {
  if (!artifacts || artifacts.length === 0) {
    return null;
  }
  const displayedArtifacts = artifacts.slice(0, visibleCount);

  return (
    <Group gap="xs" className={groupClassName} wrap="nowrap">
      {displayedArtifacts.map((artifact) => (
        <Tooltip
          key={artifact.id}
          label={artifact.tooltip}
          withArrow
          openDelay={300}
          disabled={!artifact.tooltip}
          multiline
          w={200}
        >
          <Group gap={4} wrap="nowrap">
            {artifact.icon &&
              React.cloneElement(artifact.icon, {
                size: size === "xs" ? 12 : 14,
                color: "var(--mantine-color-dimmed)",
              })}
            <Text size={size} c="dimmed" component="span" truncate className={className}>
              {artifact.content}
            </Text>
          </Group>
        </Tooltip>
      ))}
    </Group>
  );
}
