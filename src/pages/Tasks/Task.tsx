import { Link, useParams } from "react-router";
import { ITask, ITaskForm } from "../../../app/database/models/task";
import PageWrapper from "../../components/Layout/PageWrapper";
import useFetch from "../../hooks/useFetch";
import { useEffect, useRef, useState } from "react";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import StatusBar from "../../components/UI/Layout/Bottom";
import Content from "../../components/UI/Layout/Content";
import {
  ActionIcon,
  Button,
  Card,
  Grid,
  Group,
  HoverCard,
  Popover,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
  Transition,
} from "@mantine/core";
import {
  ArrowArcRightIcon,
  CalendarCheckIcon,
  CaretLeftIcon,
  CheckIcon,
  CloudArrowUpIcon,
  CloudCheckIcon,
  CloudSlashIcon,
  TimerIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import DreamWriter from "../../components/Content/DreamWriter/DreamWriter";
import { useForm } from "@mantine/form";
import { capitalize, formatDate } from "../../utils/formatting";
import { Duration } from "surrealdb";
import styles from "./Task.module.scss";
import { useLayout } from "../../contexts/LayoutContext";
import { DatePicker } from "@mantine/dates";
import Loading from "../../components/Display/Loading/Loading";
import { updateTask } from "../../utils/tasks";
import { useDebouncedCallback } from "@mantine/hooks";
import { showNotification } from "@mantine/notifications";
import { fromYYYYMMDD, toYYYYMMDD } from "../../utils/datetime";

export default function Task() {
  const { taskId } = useParams();

  const {
    data: task,
    load: loadTask,
    loading: loadingTask,
  } = useFetch<undefined, ITask>({
    url: `/tasks/${taskId}`,
    dependencies: [taskId],
  });

  useEffect(() => {
    loadTask();
  }, []);

  const taskForm = useForm({
    initialValues: {
      description: task?.description || "",
      estimatedTime: task ? new Duration(task.estimatedTime) : "",
      dueDate: task?.dueDate || null,
    },
    validate: {
      description: (value) => {
        if (!value) return "Description is required";
        if (value.length < 5)
          return "Description must be at least 5 characters";
        return null;
      },
      estimatedTime: (value) => {
        if (!value) return "Estimated time is required";
        return null;
      },
      dueDate: (value) => {
        if (!value) return "Due date is required";
        if (fromYYYYMMDD(value) < new Date())
          return "Due date must be in the future";
        return null;
      },
    },
    transformValues: (v) => {
      return {
        ...v,
        estimatedTime: v.estimatedTime.toString(),
        dueDate: v.dueDate ? v.dueDate : null,
      };
    },
  });

  useEffect(() => {
    if (!task) return;
    taskForm.setValues({
      ...task,
      estimatedTime: new Duration(task.estimatedTime).toString(),
      dueDate: task.dueDate ? task.dueDate : null,
    });
  }, [task]);

  const formattedEstimatedTime = () => {
    return taskForm.values.estimatedTime.toString();
  };

  const formattedDueDate = () => {
    if (!taskForm.values.dueDate) return "No due date.";
    return capitalize(formatDate(fromYYYYMMDD(taskForm.values.dueDate)));
  };

  const { isMobile } = useLayout();

  const [timeOptionMode, setTimeOptionMode] = useState<"options" | "manual">(
    "options",
  );

  const timePickerOptions = [
    {
      label: "15m",
      value: Duration.minutes(15).toString(),
    },
    {
      label: "30m",
      value: Duration.minutes(30).toString(),
    },
    {
      label: "1hr",
      value: Duration.hours(1).toString(),
    },
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
  ];

  useEffect(() => {
    const isInOptions = timePickerOptions.some(
      (o) => taskForm.values.estimatedTime.toString() === o.value.toString(),
    );
    if (isInOptions) {
      setTimeOptionMode("options");
    } else {
      setTimeOptionMode("manual");
    }
  }, [taskForm.values.estimatedTime]);

  const [scratchpadContent, setScratchpadContent] = useState("");
  useEffect(() => {
    if (task?.scratchpad != scratchpadContent && task?.scratchpad) {
      setScratchpadContent(task?.scratchpad);
    }
  }, [task?.scratchpad]);
  const { load: updateScratchpad } = useFetch<{ scratchpad: string }, ITask>({
    url: `/tasks/${taskId}`,
    method: "PUT",
    body: {
      scratchpad: scratchpadContent,
    },
    dependencies: [scratchpadContent, task?.scratchpad],
  });

  const [scratchpadSaved, setScratchpadSaved] = useState(true);
  const debouncedUpdateScratchpad = useDebouncedCallback(async (newContent) => {
    if (taskId) {
      updateTask(taskId, {
        scratchpad: newContent,
      }).then(() => {
        setScratchpadSaved(true);
      });
    }
  }, 200);
  useEffect(() => {
    if (loadingTask || scratchpadContent === "") {
      return;
    }
    setScratchpadSaved(false);
    debouncedUpdateScratchpad(scratchpadContent);
  }, [scratchpadContent]);

  const [dueDatePopoverOpened, setDueDatePopoverOpened] = useState(false);

  const debouncedUpdate = useDebouncedCallback(
    async (update: Partial<ITaskForm>) => {
      if (taskId) {
        updateTask(taskId, update);
      }
    },
    200,
  );
  const handleFieldUpdate = (
    field: keyof typeof taskForm.values,
    value: any,
  ) => {
    taskForm.setFieldValue(field, value);
    const { error } = taskForm.validateField(field);
    if (error) {
      showNotification({ title: "Form Error", message: error });
      return;
    }
    debouncedUpdate({
      [field]: value,
    });
  };

  const handleMarkTask = async (complete: boolean) => {
    if (!taskId) return;
    await updateTask(taskId, {
      completedAt: complete ? new Date() : null,
    });
    loadTask();
  };

  const isComplete = task?.completedAt !== null;

  return (
    <PageWrapper>
      <LeftSidebar></LeftSidebar>
      <Content>
        <Stack>
          <Group mb="lg">
            <Link
              to="/tasks"
              style={{
                textDecoration: "none",
              }}
            >
              <Group c="dark.3" gap="xs">
                <CaretLeftIcon weight="bold" size={13} />
                <Text c="dark.3" size="sm">
                  All Tasks
                </Text>
              </Group>
            </Link>
          </Group>
          <Title
            contentEditable
            onBlur={(e) => {
              handleFieldUpdate("description", e.currentTarget.innerText);
            }}
            dangerouslySetInnerHTML={{ __html: task?.description || "" }}
          />
          {!!task && (
            <>
              <Grid>
                <Grid.Col
                  span={{
                    sm: 12,
                    md: 6,
                  }}
                >
                  <Card radius="lg">
                    <Stack>
                      <Text size="xs">
                        <Group gap="xs">
                          <TimerIcon />
                          How long should this take to complete?
                        </Group>
                      </Text>
                      <Group wrap="nowrap">
                        {timeOptionMode === "options" ? (
                          <SegmentedControl
                            data={timePickerOptions}
                            value={taskForm.values.estimatedTime.toString()}
                            onChange={(value) => {
                              handleFieldUpdate(
                                "estimatedTime",
                                new Duration(value),
                              );
                            }}
                            classNames={{ root: styles.suggestions }}
                            withItemsBorders={false}
                            size={isMobile ? "xs" : "sm"}
                            radius="lg"
                            w="100%"
                          />
                        ) : (
                          <TextInput
                            placeholder={`Example: 2h30m, 90m, or 1d2h.`}
                            error={taskForm.errors.estimatedTime}
                            defaultValue={taskForm.values.estimatedTime.toString()}
                            onChange={(v) => {
                              try {
                                const d = new Duration(v.currentTarget.value);
                                handleFieldUpdate("estimatedTime", d);
                              } catch (error) {
                                console.error("Error: ", error);
                                taskForm.setFieldError(
                                  "estimatedTime",
                                  `Invalid format. Try "2h30m", "90m", or "1.5d".`,
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
                  </Card>
                </Grid.Col>
                <Grid.Col
                  span={{
                    sm: 12,
                    md: 6,
                  }}
                >
                  <Card radius="lg">
                    <Stack>
                      <Text size="xs">
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
                            onClick={() =>
                              setDueDatePopoverOpened(!dueDatePopoverOpened)
                            }
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
                              value={taskForm.values.dueDate}
                              onChange={(date) => {
                                if (date) {
                                  const formattedDate = date;
                                  handleFieldUpdate("dueDate", formattedDate);
                                  setDueDatePopoverOpened(false);
                                }
                              }}
                            />
                          </Stack>
                        </Popover.Dropdown>
                      </Popover>
                    </Stack>
                  </Card>
                </Grid.Col>
                <Grid.Col span={12}>
                  <Card radius="lg">
                    <Group>
                      <Button
                        radius="lg"
                        leftSection={
                          isComplete ? (
                            <XCircleIcon weight="bold" />
                          ) : (
                            <CheckIcon weight="bold" />
                          )
                        }
                        variant={isComplete ? "light" : "filled"}
                        onClick={() => {
                          handleMarkTask(!isComplete);
                        }}
                        color="dark.1"
                      >
                        Mark {isComplete ? "Incomplete" : "Complete"}
                      </Button>
                    </Group>
                  </Card>
                </Grid.Col>
                <Grid.Col span={12}>
                  <Text fw="bold" c="dimmed" size="xs">
                    <Group gap="xs">
                      SCRATCHPAD{" "}
                      {scratchpadSaved ? (
                        <ActionIcon
                          size="xs"
                          variant="subtle"
                          color="gray"
                          title="This content is saved."
                        >
                          <CloudCheckIcon weight="bold" />
                        </ActionIcon>
                      ) : (
                        <ActionIcon
                          size="xs"
                          variant="subtle"
                          color="gray"
                          title="This content is saving..."
                        >
                          <CloudArrowUpIcon weight="bold" />
                        </ActionIcon>
                      )}
                    </Group>
                  </Text>
                  <DreamWriter
                    initialContent={task.scratchpad}
                    onBlur={() => {
                      updateScratchpad();
                    }}
                    onChange={(v) => {
                      setScratchpadContent(v);
                    }}
                    readOnly={!task}
                  />
                </Grid.Col>
              </Grid>
            </>
          )}
        </Stack>
      </Content>
      <StatusBar></StatusBar>
      <RightSidebar></RightSidebar>
    </PageWrapper>
  );
}
