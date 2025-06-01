import React from "react";
import { Menu, Button, ActionIcon, Group, Tooltip } from "@mantine/core";
import { DotsThreeVertical } from "@phosphor-icons/react"; // Phosphor Icon
import type { IIdea, IdeaAction } from "./IdeaCardTypes";
import styles from "./IdeaCards.module.scss";

interface IdeaActionsGroupProps {
  idea: IIdea;
  actions: IdeaAction[];
  visibleCount?: number;
  buttonSize?: "xs" | "sm";
  menuPosition?: "bottom-end" | "bottom-start" | "top-end" | "top-start";
  className?: string;
  groupClassName?: string;
}

export function IdeaActionsGroup({
  idea,
  actions,
  visibleCount = 2,
  buttonSize = "xs",
  menuPosition = "bottom-end",
  className, // For the individual buttons/menu icon if needed for specific styling
  groupClassName, // For the <Group> wrapper
}: IdeaActionsGroupProps) {
  if (!actions || actions.length === 0) {
    return null;
  }

  const primaryActions = actions
    .filter((a) => !a.isOverflow)
    .slice(0, visibleCount);
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
              action.onClick(e, idea);
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
        <Menu
          shadow="md"
          width={200}
          position={menuPosition}
          withArrow
          trigger="hover"
        >
          <Menu.Target>
            <Tooltip label="More options" withArrow openDelay={500}>
              <ActionIcon
                variant="subtle"
                color="gray"
                size={buttonSize === "xs" ? "md" : "lg"} // Mantine ActionIcon size prop
                className={`${styles.actionButton} ${className || ""}`}
                aria-label="More actions"
              >
                <DotsThreeVertical
                  weight="bold"
                  size={buttonSize === "xs" ? 18 : 20}
                />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            {overflowActions.map((action) => (
              <Menu.Item
                key={action.id}
                leftSection={
                  action.icon
                    ? React.cloneElement(action.icon, { size: 16 })
                    : undefined
                }
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick(e, idea);
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
