import { useNavigate } from "react-router";
import { IPublicTask, ITask } from '../../../../../app/database/models/task';
import styles from "./TaskButton.module.scss";
import {
  ActionIcon,
  Checkbox,
  Group,
  HoverCard,
  MantineColor,
  Popover,
  Stack,
  Text,
} from "@mantine/core";
import { updateTask } from '@domains/knowledge/utils/tasks';
import { ArrowRightIcon, EyeIcon, IconProps } from "@phosphor-icons/react";
import React, { useState } from "react";
import { useDisclosure } from "@mantine/hooks";
import { capitalize, formatDate } from '@core/utils/formatting';
import { fromYYYYMMDD } from '@core/utils/datetime';
import { useLayout } from '@/contexts/LayoutContext';
import { useLandscape } from '@/contexts/LandscapeContext';
import { getFormattedDate } from "@mantine/dates";

type ITaskButtonAction = {
  id: string;
  onClick: (e: React.MouseEvent) => void;
  icon: React.ReactElement<IconProps>;
  color?: MantineColor | string;
  tooltip?: string;
};

interface ITaskButton {
  task: IPublicTask;
  onClick?: () => void;
  onMark?: (complete: boolean) => void;
  link?: boolean;
  actions?: ITaskButtonAction[];
  detail?: "simple" | "full";
}

export default function TaskButton({
  task,
  onClick,
  onMark,
  link = true,
  actions,
  detail = "full",
}: ITaskButton) {
  const navigate = useNavigate();

  const {
    dragging: {
      current: { set: setDragging },
    },
  } = useLandscape();

  const handleClick = () => {
    onClick?.();
    if (link) {
      navigate(`/task/${task.id.toString()}`);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    setDragging(task.id.toString());
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        taskId: task.id.toString(),
        thingId: task.id.toString(),
      })
    );
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    setDragging(null);
  };

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

  const formattedDueDate = () => {
    if (!task.dueDate) return "No due date.";
    return capitalize(formatDate(fromYYYYMMDD(task.dueDate)));
  };

  const [hovering, setHovering] = useState(false);

  const { isMobile } = useLayout();

  const allActions: ITaskButtonAction[] = [
    ...(actions || []),
    ...(isMobile
      ? [
          {
            id: "preview",
            onClick: () => {
              toggle();
            },
            icon: <EyeIcon />,
          },
        ]
      : []),
    {
      id: "view",
      onClick: () => {
        navigate(`/task/${task.id.toString()}`);
      },
      icon: <ArrowRightIcon />,
    },
  ];

  const [opened, { toggle, open, close }] = useDisclosure();

  const isOverdue = () => {
    if (!task.dueDate) return false;
    return new Date(task.dueDate) < new Date();
  };

  return (
    <Popover
      opened={opened}
      closeOnClickOutside
      onChange={(o) => {
        if (o) {
          open();
        } else {
          close();
        }
      }}
      width="400px"
      shadow="lg"
      radius="md"
      transitionProps={{
        transition: "fade-down",
        duration: 200,
        timingFunction: "ease-out",
      }}
      disabled={detail === "simple"}
    >
      <Popover.Target>
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
            if (e.key === "ArrowRight") {
              navigate(`/task/${task.id.toString()}`);
            }
          }}
          className={`${styles.taskButton} ${isOverdue() ? styles.overdue : ""}`}
          data-task-id={task.id.toString()}
          data-thing-id={task.id.toString()}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          draggable={true}
          onMouseEnter={() => {
            setHovering(true);
          }}
          onMouseLeave={() => {
            setHovering(false);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            if (detail === "full") {
              toggle();
            }
          }}
        >
          <div className={styles.content}>
            <Checkbox
              variant="outline"
              defaultChecked={isCompleted}
              onClick={(e) => {
                e.stopPropagation();
                handleMarkTask(e.currentTarget.checked);
              }}
              color="gray"
              size="sm"
            />
            <div className={styles.info}>
              <div className={styles.top}>
                <Group gap="xs" align="center" wrap="nowrap">
                  <Text
                    size="sm"
                    lineClamp={1}
                    c={isCompleted ? "dimmed" : "inherit"}
                    td={isCompleted ? "line-through" : undefined}
                  >
                    {task.description}
                  </Text>
                </Group>
              </div>
              {detail === "full" && (
                <div className={styles.bottom}>
                  <Group gap="xs" align="center" wrap="nowrap">
                    <Text size="xs" lineClamp={1} c="dark.5">
                      {task.estimatedTime.toString()}{" "}
                      {task.dueDate && (
                        <Text inline component="span" c={isOverdue() ? "red.5" : "inherit"}>
                          {formatDate(new Date(task.dueDate))}
                        </Text>
                      )}
                    </Text>
                  </Group>
                </div>
              )}
            </div>
            {detail === "full" && hovering && (
              <Group gap="xs" wrap="nowrap">
                {allActions?.map((action) => {
                  return (
                    <ActionIcon
                      key={action.id.toString()}
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
      </Popover.Target>
      <Popover.Dropdown
        onClick={(e) => {
          e.stopPropagation();
        }}
        style={{
          maxHeight: "400px",
          overflowY: "scroll",
        }}
      >
        <Stack gap="xs">
          <Text c="dimmed" fw="bold" size="sm">
            {task.description}
          </Text>
          <Text c="dimmed" fs="italic" size="sm">
            Due {formattedDueDate()}, estimated to take {formattedEstimatedDuration()}
          </Text>
          {!!task.scratchpad && (
            <Text
              size="sm"
              dangerouslySetInnerHTML={{
                __html: task.scratchpad,
              }}
            />
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
