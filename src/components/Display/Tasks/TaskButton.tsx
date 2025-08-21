import { useNavigate } from "react-router";
import { ITask } from "../../../../app/database/models/task";
import styles from "./TaskButton.module.scss";
import {
  ActionIcon,
  Checkbox,
  Group,
  HoverCard,
  MantineColor,
  Text,
} from "@mantine/core";
import DreamWriter from "../../Content/DreamWriter/DreamWriter";
import useFetch from "../../../hooks/useFetch";
import { updateTask } from "../../../utils/tasks";
import { ArrowRightIcon, IconProps } from "@phosphor-icons/react";
import React, { useState } from "react";

type ITaskButtonAction = {
  id: string;
  onClick: (e: React.MouseEvent) => void;
  icon: React.ReactElement<IconProps>;
  color?: MantineColor | string;
  tooltip?: string;
};

interface ITaskButton {
  task: ITask;
  onClick?: () => void;
  onMark?: (complete: boolean) => void;
  link?: boolean;
  actions?: ITaskButtonAction[];
}

export default function TaskButton({
  task,
  onClick,
  onMark,
  link = true,
  actions,
}: ITaskButton) {
  const navigate = useNavigate();

  const handleClick = () => {
    onClick?.();
    if (link) {
      navigate(`/task/${task.id.toString()}`);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        taskId: task.id.toString(),
      }),
    );
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {};

  const handleMarkTask = async (complete: boolean) => {
    await updateTask(task.id, {
      completedAt: complete ? new Date() : null,
    });
    onMark?.(complete);
  };

  const isCompleted = task.completedAt !== null;

  const formattedEstimatedDuration = () => {
    return task.estimatedTime.toString();
  };

  const [hovering, setHovering] = useState(false);

  const allActions: ITaskButtonAction[] = [
    ...(actions || []),
    {
      id: "view",
      onClick: () => {
        navigate(`/task/${task.id.toString()}`);
      },
      icon: <ArrowRightIcon />,
    },
  ];

  return (
    <div
      role="button"
      onClick={() => {
        handleClick();
      }}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          handleClick();
        }
      }}
      className={styles.taskButton}
      data-task-id={task.id.toString()}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      draggable={true}
      onMouseEnter={() => {
        setHovering(true);
      }}
      onMouseLeave={() => {
        setHovering(false);
      }}
    >
      <div className={styles.content}>
        <Group gap="xs" align="center" wrap="nowrap">
          <Checkbox
            variant="outline"
            defaultChecked={isCompleted}
            onClick={(e) => {
              e.stopPropagation();
              handleMarkTask(e.currentTarget.checked);
            }}
            color="gray"
            size="xs"
          />
          <Text
            size="sm"
            lineClamp={0}
            c={isCompleted ? "dimmed" : "inherit"}
            td={isCompleted ? "line-through" : undefined}
          >
            {task.description}
          </Text>
        </Group>
        {hovering && (
          <Group>
            {allActions?.map((action) => {
              return (
                <ActionIcon
                  size="xs"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    action.onClick(e);
                  }}
                  variant="subtle"
                  color={action.color ? action.color : "dark.4"}
                  title={action.tooltip}
                >
                  {action.icon
                    ? React.cloneElement(action.icon, {
                        size: 12,
                      })
                    : undefined}
                </ActionIcon>
              );
            })}
          </Group>
        )}
      </div>
    </div>
  );
}
