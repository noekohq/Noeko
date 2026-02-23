import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  MantineColor,
  Menu,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { ITag } from '../../../../../shared/types/tags';
import {
  DotsThreeVertical,
  DotsThreeVerticalIcon,
  IconProps,
  TagIcon,
} from "@phosphor-icons/react";
import React from "react";
import styles from "./TagCard.module.scss";
import { Link } from "react-router";

type TagArtifact = {
  id: string;
  content: React.ReactNode;
  tooltip?: string;
  icon?: React.ReactElement<IconProps>;
};

type TagAction = {
  id: string;
  label: string;
  icon?: React.ReactElement<IconProps>;
  onClick: (event: React.MouseEvent, tag: ITag) => void;
  color?: MantineColor;
  variant?: "filled" | "light" | "outline" | "default" | "subtle" | "transparent" | "white";
  disabled?: boolean;
  tooltip?: string;
  isOverflow?: boolean;
};

interface ITagCardProps {
  tag: ITag;
  artifacts?: TagArtifact[];
  actions?: TagAction[];
}

export default function TagCard({ tag, artifacts, actions }: ITagCardProps) {
  return (
    <Card withBorder radius="md" component={Link} to={`/tags/${tag.id}`}>
      <Stack gap="xs">
        <Group justify="space-between">
          <Badge size="lg" color="dark.7" leftSection={<TagIcon weight="bold" />}>
            <Text size="sm" fw="bold">
              {tag.name}
            </Text>
          </Badge>
          {actions && actions.length > 0 && (
            <TagActionsGroup tag={tag} actions={actions} buttonSize="xs" visibleCount={0} />
          )}
        </Group>
        <Group>
          <Text c="dimmed" size="xs">
            {tag.description}
          </Text>
        </Group>
        <Group>
          {artifacts && artifacts.length > 0 && <ArtifactsDisplay artifacts={artifacts} />}
        </Group>
      </Stack>
    </Card>
  );
}

interface ArtifactsDisplayProps {
  artifacts: TagArtifact[];
  visibleCount?: number;
  size?: "xs" | "sm";
  className?: string;
  groupClassName?: string;
}

export function ArtifactsDisplay({
  artifacts,
  visibleCount = Infinity,
  size = "xs",
  className,
  groupClassName,
}: ArtifactsDisplayProps) {
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

interface TagActionsGroupProps {
  tag: ITag;
  actions: TagAction[];
  visibleCount?: number;
  buttonSize?: "xs" | "sm";
  menuPosition?: "bottom-end" | "bottom-start" | "top-end" | "top-start";
  className?: string;
  groupClassName?: string;
}

function TagActionsGroup({
  tag,
  actions,
  visibleCount = 2,
  buttonSize = "xs",
  menuPosition = "bottom-end",
  className, // For the individual buttons/menu icon if needed for specific styling
  groupClassName, // For the <Group> wrapper
}: TagActionsGroupProps) {
  if (!actions || actions.length === 0) {
    return null;
  }

  const primaryActions = actions.filter((a) => !a.isOverflow).slice(0, visibleCount);
  const overflowActions = [
    ...actions.filter((a) => !a.isOverflow).slice(visibleCount),
    ...actions.filter((a) => a.isOverflow),
  ];

  return (
    <Group justify="flex-start" gap="xs" className={groupClassName}>
      {primaryActions.map((action) => (
        <Tooltip
          key={action.id}
          label={action.tooltip || action.label}
          withArrow
          openDelay={500}
          disabled={!action.tooltip}
        >
          <Button
            size={buttonSize}
            variant={action.variant || "light"}
            color={action.color}
            onClick={(e) => {
              e.stopPropagation();
              action.onClick(e, tag);
            }}
            disabled={action.disabled}
            leftSection={
              action.icon
                ? React.cloneElement(action.icon, {
                    size: buttonSize === "xs" ? 14 : 16,
                  })
                : undefined
            }
            className={`${styles.actionButton} ${className || ""}`}
          >
            {action.label}
          </Button>
        </Tooltip>
      ))}
      {overflowActions.length > 0 && (
        <Menu shadow="md" width={200} position={menuPosition} withArrow trigger="hover">
          <Menu.Target>
            <ActionIcon
              variant="subtle"
              color="gray"
              size={buttonSize === "xs" ? "md" : "lg"} // Mantine ActionIcon size prop
              className={`${styles.actionButton} ${className || ""}`}
              aria-label="More actions"
            >
              <DotsThreeVerticalIcon weight="bold" size={buttonSize === "xs" ? 18 : 20} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            {overflowActions.map((action) => (
              <Menu.Item
                key={action.id}
                leftSection={
                  action.icon ? React.cloneElement(action.icon, { size: 16 }) : undefined
                }
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick(e, tag);
                }}
                disabled={action.disabled}
                color={action.color}
              >
                {action.label}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  );
}
