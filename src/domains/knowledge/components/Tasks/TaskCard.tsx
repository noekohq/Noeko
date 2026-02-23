import { useNavigate } from "react-router";
import { ITask } from '../../../../../app/database/models/task';
import styles from "./TaskCard.module.scss";
import {
  ActionIcon,
  Button,
  Checkbox,
  Group,
  HoverCard,
  MantineColor,
  Menu,
  Popover,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { DreamWriter } from '@editor';
import useFetch from '@core/hooks/useFetch';
import { updateTask } from '@domains/knowledge/utils/tasks';
import { DotsThreeVerticalIcon, IconProps } from "@phosphor-icons/react";
import { useDisclosure } from "@mantine/hooks";
import { capitalize, formatDate } from '@core/utils/formatting';
import { fromYYYYMMDD } from '@core/utils/datetime';

export type ITaskAction = {
  id: string;
  label: string;
  icon?: React.ReactElement<IconProps>;
  onClick: (event: React.MouseEvent, task: ITask) => void;
  color?: MantineColor;
  variant?: "filled" | "light" | "outline" | "default" | "subtle" | "transparent" | "white";
  disabled?: boolean;
  tooltip?: string;
};

interface ITaskCard {
  task: ITask;
  onClick?: () => void;
  onMark?: (complete: boolean) => void;
  link?: boolean;
  actions?: ITaskAction[];
  actionsVisible?: number;
}

export default function TaskCard({
  task,
  onClick,
  onMark,
  link = true,
  actions = [],
  actionsVisible = 0,
}: ITaskCard) {
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
      })
    );
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {};

  const handleMarkTask = async (complete: boolean) => {
    await updateTask(task.id, {
      completedAt: complete ? new Date() : null,
    });
    onMark?.(complete);
  };

  const getHiddenActions = () => {
    return actions?.slice(actionsVisible);
  };

  const getVisibleActions = () => {
    return actions?.slice(0, actionsVisible);
  };

  const hiddenActions = getHiddenActions() ?? [];
  const visibleActions = getVisibleActions() ?? [];

  const isCompleted = task.completedAt !== null;

  const formattedEstimatedDuration = () => {
    return task.estimatedTime.toString();
  };

  const formattedDueDate = () => {
    if (!task.dueDate) return "No due date.";
    return capitalize(formatDate(fromYYYYMMDD(task.dueDate)));
  };

  const [opened, { toggle, open, close }] = useDisclosure();

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
      width="target"
      shadow="lg"
      radius="md"
      transitionProps={{
        transition: "fade-down",
        duration: 200,
        timingFunction: "ease-out",
      }}
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
          }}
          className={styles.taskCard}
          data-task-id={task.id.toString()}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          draggable={true}
          onContextMenu={(e) => {
            e.preventDefault();
            toggle();
          }}
        >
          <div className={styles.content}>
            <Checkbox
              onClick={(e) => {
                e.stopPropagation();
                handleMarkTask(e.currentTarget.checked);
              }}
              defaultChecked={isCompleted}
            />
            <Group gap="xs" align="baseline" wrap="nowrap">
              <Text size="sm" fw="bold" lineClamp={0}>
                {task.description}
              </Text>
              <Text size="xs" c="dark.5" fw="bold">
                {formattedEstimatedDuration()}
              </Text>
            </Group>
            <Group>
              {visibleActions.map((action) => {
                return (
                  <Tooltip label={action.tooltip} key={action.id}>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        action.onClick(e, task);
                      }}
                      color={action.color ?? "dark.1"}
                      disabled={action.disabled}
                      leftSection={action.icon}
                      size="xs"
                      variant="light"
                    >
                      {action.label}
                    </Button>
                  </Tooltip>
                );
              })}
            </Group>
          </div>
          <div className={styles.actions}>
            {!!hiddenActions?.length && (
              <Menu position="bottom-end" withArrow>
                <Menu.Target>
                  <ActionIcon
                    size="md"
                    variant="subtle"
                    color="gray"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <DotsThreeVerticalIcon />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  {hiddenActions?.map((action) => {
                    return (
                      <Menu.Item
                        key={action.id}
                        leftSection={action.icon}
                        onClick={(e) => {
                          e.stopPropagation();
                          action.onClick(e, task);
                        }}
                        color={action.color}
                      >
                        {action.label}
                      </Menu.Item>
                    );
                  })}
                </Menu.Dropdown>
              </Menu>
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
