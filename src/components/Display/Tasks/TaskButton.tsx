import { useNavigate } from "react-router";
import { ITask } from "../../../../app/database/models/task";
import styles from "./TaskButton.module.scss";
import { Checkbox, Group, HoverCard, Text } from "@mantine/core";
import DreamWriter from "../../Content/DreamWriter/DreamWriter";
import useFetch from "../../../hooks/useFetch";
import { updateTask } from "../../../utils/tasks";

interface ITaskButton {
  task: ITask;
  onClick?: () => void;
  onMark?: (complete: boolean) => void;
  link?: boolean;
}

export default function TaskButton({
  task,
  onClick,
  onMark,
  link = true,
}: ITaskButton) {
  const navigate = useNavigate();

  const handleClick = () => {
    onClick?.();
    if (link) {
      navigate(`/tasks/${task.id.toString()}`);
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
    >
      <HoverCard radius="lg" openDelay={500} width={"400px"} withArrow>
        <HoverCard.Target>
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
            <Text
              size="sm"
              fw="bold"
              lineClamp={0}
              c={isCompleted ? "dimmed" : "inherit"}
              td={isCompleted ? "line-through" : undefined}
            >
              {task.description}
            </Text>
          </div>
        </HoverCard.Target>
        {/*<HoverCard.Dropdown
          style={{ overflowY: "scroll", maxHeight: "400px" }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <DreamWriter initialContent={task.scratchpad} />
        </HoverCard.Dropdown>*/}
      </HoverCard>
    </div>
  );
}
