import { useForm } from "@mantine/form";
import { ITask } from "../../../../../app/database/models/task";
import { Duration } from "surrealdb";
import {
  ActionIcon,
  Box,
  Button,
  Grid,
  Group,
  Popover,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
  Transition,
} from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import styles from "./CreateTask.module.scss";
import {
  ArrowArcRightIcon,
  CalendarCheckIcon,
  TextAlignLeftIcon,
  TimerIcon,
} from "@phosphor-icons/react";
import { capitalize, formatDate, formatDateTime } from "@core/utils/formatting";
import { useLayout } from "@/contexts/LayoutContext";
import { DatePicker } from "@mantine/dates";
import { showNotification } from "@mantine/notifications";
import { createTask } from "@domains/knowledge/utils/tasks";
import { DreamWriter } from "@domains/editor";
import { useNavigate } from "react-router";
import { fromYYYYMMDD, toYYYYMMDD } from "@core/utils/datetime";
import useRabbithole from "@domains/rabbitholes/hooks/useRabbithole";

interface ICreateTaskFormProps {
  onSubmit?: (task: ITask) => void;
  initialDescription?: ITask["description"];
}

export default function CreateTaskForm({ onSubmit, initialDescription }: ICreateTaskFormProps) {
  const initialTaskDate = () => {
    const d = new Date();
    d.setHours(d.getHours());
    return toYYYYMMDD(d);
  };

  const taskForm = useForm({
    initialValues: {
      description: (initialDescription ?? "") as ITask["description"],
      estimatedTime: Duration.hours(1) as ITask["estimatedTime"],
      dueDate: initialTaskDate() as ITask["dueDate"],
      scratchpad: "" as ITask["scratchpad"],
    },
    validate: {
      description: (value) => {
        if (!value) return "Description is required";
        if (value.length < 5) return "Description must be at least 5 characters";
        return null;
      },
      estimatedTime: (value) => {
        if (!value) return "Estimated time is required";
        return null;
      },
      dueDate: (value) => {
        if (!value) return "Due date is required";
        return null;
      },
    },
    transformValues: (v) => {
      return {
        ...v,
        completedAt: null,
      };
    },
  });

  const formattedEstimatedTime = () => {
    return taskForm.values.estimatedTime.toString();
  };
  const formattedDueDate = () => {
    if (!taskForm.values.dueDate) return "No due date.";
    return capitalize(formatDate(fromYYYYMMDD(taskForm.values.dueDate)));
  };

  const [settingEstimatedTime, setSettingEstimatedTime] = useState(false);
  const [timeOptionMode, setTimeOptionMode] = useState<"options" | "manual">("options");

  const [settingDueDate, setSettingDueDate] = useState(false);
  const [dueDatePopoverOpened, setDueDatePopoverOpened] = useState(false);
  useEffect(() => {
    if (taskForm.values.dueDate) {
      setDueDatePopoverOpened(false);
    }
  }, [taskForm.values.dueDate]);

  const [settingScratchpad, setSettingScratchpad] = useState(false);

  const { isMobile } = useLayout();

  const navigate = useNavigate();

  const { isDownRabbithole, includeThing } = useRabbithole();

  const handleSubmit = async () => {
    const { errors, hasErrors } = taskForm.validate();
    if (hasErrors) {
      showNotification({
        title: "Validation Error",
        message: Object.values(errors)[0],
        color: "red",
      });
      return;
    }
    try {
      const task = await createTask(taskForm.getTransformedValues());
      if (!task) {
        throw new Error("Task wasn't returned");
      }
      navigate(`/task/${task.id.toString()}`);
      onSubmit?.(task);
      if (isDownRabbithole) {
        includeThing(task.id.toString());
      }
    } catch (error) {
      console.error("Error submitting task: ", error);
      showNotification({
        title: "Something went wrong",
        message: "Something went wrong creating the task",
        color: "red",
      });
    }
  };

  return (
    <div className={styles.createTask}>
      <Grid gutter="md">
        <Grid.Col>
          <Textarea
            placeholder="Describe the task"
            {...taskForm.getInputProps("description")}
            variant="unstyled"
            autosize
          />
        </Grid.Col>
        <Transition mounted={settingEstimatedTime} transition="fade-down">
          {(style) => {
            return (
              <Grid.Col style={style}>
                <Stack gap="0">
                  <Text size="xs" mb="sm">
                    <Group gap="xs">
                      <TimerIcon />
                      How long should this take to complete?
                    </Group>
                  </Text>
                  <Group wrap="nowrap">
                    {timeOptionMode === "options" ? (
                      <SegmentedControl
                        data={[
                          {
                            label: "15m",
                            value: Duration.minutes(15).toString(),
                          },
                          {
                            label: "30m",
                            value: Duration.minutes(30).toString(),
                          },
                          { label: "1hr", value: Duration.hours(1).toString() },
                          {
                            label: "2hrs",
                            value: Duration.hours(2).toString(),
                          },
                          {
                            label: "4hrs",
                            value: Duration.hours(4).toString(),
                          },
                          {
                            label: "8hrs",
                            value: Duration.hours(8).toString(),
                          },
                        ]}
                        value={taskForm.values.estimatedTime.toString()}
                        onChange={(value) => {
                          taskForm.setFieldValue("estimatedTime", new Duration(value));
                        }}
                        classNames={{ root: styles.suggestions }}
                        color="dark.3"
                        bg="dark.8"
                        withItemsBorders={false}
                        size={isMobile ? "xs" : "sm"}
                        radius="lg"
                        w="100%"
                      />
                    ) : (
                      <TextInput
                        placeholder={`Example: 2h30m, 90m, or 1d2h.`}
                        error={taskForm.errors.estimatedTime}
                        onChange={(v) => {
                          try {
                            const d = new Duration(v.currentTarget.value);
                            taskForm.setFieldValue("estimatedTime", d);
                          } catch (error) {
                            console.error("Error: ", error);
                            taskForm.setFieldError(
                              "estimatedTime",
                              `Invalid format. Try "2h30m", "90m", or "1.5d".`
                            );
                          }
                        }}
                        size="sm"
                        variant="filled"
                        errorProps={{
                          c: "red.4",
                        }}
                        radius="lg"
                        w="100%"
                        styles={{
                          input: {
                            backgroundColor: "var(--mantine-color-dark-8)",
                          },
                        }}
                      />
                    )}
                    <ActionIcon
                      onClick={() => {
                        setTimeOptionMode((prev) => {
                          if (prev === "manual") {
                            return "options";
                          }
                          return "manual";
                        });
                      }}
                      variant="light"
                      size="sm"
                      color="dark.3"
                    >
                      <ArrowArcRightIcon />
                    </ActionIcon>
                  </Group>
                </Stack>
              </Grid.Col>
            );
          }}
        </Transition>
        <Transition mounted={settingDueDate} transition="fade-up">
          {(style) => {
            return (
              <Grid.Col style={style}>
                <Text size="xs" mb="sm">
                  <Group gap="xs">
                    <CalendarCheckIcon />
                    When should this be done?
                  </Group>
                </Text>

                <Popover
                  opened={dueDatePopoverOpened}
                  onClose={() => {
                    setDueDatePopoverOpened(false);
                  }}
                  closeOnClickOutside
                  closeOnEscape
                >
                  <Popover.Target>
                    <Button
                      variant="default"
                      size="sm"
                      radius="lg"
                      fullWidth
                      onClick={() => setDueDatePopoverOpened(!dueDatePopoverOpened)}
                    >
                      {formattedDueDate()}
                    </Button>
                  </Popover.Target>
                  <Popover.Dropdown
                    w="300px"
                    style={{
                      maxHeight: "400px",
                      overflowY: "scroll",
                    }}
                  >
                    <Stack>
                      <Text fw="bold" size="sm">
                        Select Date
                      </Text>
                      <DatePicker
                        styles={{
                          calendarHeader: {
                            width: "100%",
                          },
                        }}
                        {...taskForm.getInputProps("dueDate")}
                      />
                    </Stack>
                  </Popover.Dropdown>
                </Popover>
              </Grid.Col>
            );
          }}
        </Transition>
        <Transition mounted={settingScratchpad} transition="fade-up">
          {(style) => {
            return (
              <Grid.Col style={style}>
                <Text size="xs" mb="sm">
                  <Group gap="xs">
                    <TextAlignLeftIcon />
                    Any additional details or thoughts?
                  </Group>
                </Text>
                <DreamWriter
                  onChange={(value) => {
                    taskForm.setFieldValue("scratchpad", value);
                  }}
                />
              </Grid.Col>
            );
          }}
        </Transition>
        <Grid.Col>
          <Group gap="lg">
            {!settingScratchpad && (
              <Tooltip label="Scratchpad">
                <Group
                  gap="xs"
                  onClick={() => {
                    setSettingScratchpad(true);
                  }}
                >
                  <ActionIcon variant="light" radius="md" color="gray">
                    <TextAlignLeftIcon />
                  </ActionIcon>
                </Group>
              </Tooltip>
            )}
            {!settingEstimatedTime && (
              <Tooltip label="Estimated time to complete">
                <Group
                  gap="xs"
                  onClick={() => {
                    setSettingEstimatedTime(true);
                  }}
                >
                  <ActionIcon variant="light" radius="md" color="gray">
                    <TimerIcon />
                  </ActionIcon>
                  <Text size="xs" c="gray" fw="bold">
                    {formattedEstimatedTime()}
                  </Text>
                </Group>
              </Tooltip>
            )}
            {!settingDueDate && (
              <Tooltip label="Due Date">
                <Group
                  gap="xs"
                  onClick={() => {
                    setSettingDueDate(true);
                  }}
                >
                  <ActionIcon variant="light" radius="md" color="gray">
                    <CalendarCheckIcon />
                  </ActionIcon>
                  <Text size="xs" c="gray" fw="bold">
                    {formattedDueDate()}
                  </Text>
                </Group>
              </Tooltip>
            )}
          </Group>
        </Grid.Col>
        <Grid.Col>
          <Group justify="right">
            <Button variant="light" color="dark.2" onClick={handleSubmit}>
              Save
            </Button>
          </Group>
        </Grid.Col>
      </Grid>
    </div>
  );
}
