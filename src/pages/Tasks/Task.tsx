import { Link, useNavigate, useParams } from "react-router";
import { ITask, ITaskForm } from "../../../app/database/models/task";
import PageWrapper from "../../components/Layout/PageWrapper";
import useFetch from "../../hooks/useFetch";
import { useCallback, useEffect, useRef, useState } from "react";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import StatusBar from "../../components/UI/Layout/Bottom";
import Content from "../../components/UI/Layout/Content";
import {
  ActionIcon,
  Button,
  Divider,
  Group,
  Loader,
  Menu,
  Popover,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  ArrowArcRightIcon,
  CalendarCheckIcon,
  CaretLeftIcon,
  CheckIcon,
  DotsThreeVerticalIcon,
  TimerIcon,
  TrashSimpleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import DreamWriter from "../../components/Content/DreamWriter/DreamWriter";
import { useForm } from "@mantine/form";
import { capitalize, formatDate } from "../../utils/formatting";
import { Duration } from "surrealdb";
import styles from "./Task.module.scss";
import { useLayout } from "../../contexts/LayoutContext";
import { DatePicker } from "@mantine/dates";
import { updateTask } from "../../utils/tasks";
import { useDebouncedCallback } from "@mantine/hooks";
import { showNotification } from "@mantine/notifications";
import { fromYYYYMMDD, toYYYYMMDD } from "../../utils/datetime";
import Search from "../../components/Search/Search";
import { modals } from "@mantine/modals";
import ConnectionManager from "../../components/Display/Interactions/Connections/ConnectionManager";
import { useLandscape } from "../../contexts/LandscapeContext";
import useConnectable from "../../hooks/useConnectable";
import TagsManager from "../../components/Display/Interactions/Tags/TagsManager";

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

  const navigate = useNavigate();

  const { load: triggerDeleteTask, loading: loadingDelete } = useFetch({
    url: `/tasks/${taskId}`,
    dependencies: [taskId],
    method: "DELETE",
    onSuccess: () => {
      navigate(-1);
      showNotification({
        title: "Success",
        message: "Task deleted successfully",
      });
    },
    onError: (error: any) => {
      console.error("Error deleting task: ", error);
      showNotification({
        title: "Error Deleting",
        message: `There was an error deleting the task: ${error?.response?.data?.message || error?.message || "Unknown error"}`,
        color: "red",
      });
    },
  });

  const handleDeleteTask = useCallback(() => {
    if (loadingDelete) return;
    modals.openConfirmModal({
      title: "Are you sure you want to delete this task?",
      centered: true,
      children: (
        <Text size="sm">
          This action cannot be undone. All associated data will be lost.
        </Text>
      ),
      labels: { confirm: "Delete Task", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => triggerDeleteTask(),
    });
  }, [loadingDelete, triggerDeleteTask, taskId]);

  useEffect(() => {
    loadTask();
  }, []);

  const {
    connectable: {
      viewing: { set: setViewing },
    },
  } = useLandscape();

  useEffect(() => {
    if (task) {
      setViewing({
        ...task,
        type: "task",
      });
    }

    return () => {
      setViewing(null);
    };
  }, [task]);

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

  const { connect, isConnected } = useConnectable({
    connectable: task ? { ...task, type: "task" } : null,
  });

  return (
    <PageWrapper>
      <LeftSidebar>
        <LeftSidebar.Open>
          <Stack>
            <Stack>
              <Text size="xs">
                <Group gap="xs" wrap="nowrap">
                  <TimerIcon />
                  How long should this take to complete?
                </Group>
              </Text>
              <Group wrap="nowrap" gap="xs">
                {timeOptionMode === "options" ? (
                  <SegmentedControl
                    data={timePickerOptions}
                    value={taskForm.values.estimatedTime.toString()}
                    onChange={(value) => {
                      handleFieldUpdate("estimatedTime", new Duration(value));
                    }}
                    classNames={{ root: styles.suggestions }}
                    withItemsBorders={false}
                    size={isMobile ? "xs" : "xs"}
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
                  size="xs"
                  color="dark.3"
                >
                  <ArrowArcRightIcon />
                </ActionIcon>
              </Group>
            </Stack>
            <Divider />
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
            {!!task && (
              <TagsManager
                connectable={{
                  ...task,
                  type: "task",
                }}
                maxSuggested={2}
              />
            )}
            {!!task && (
              <ConnectionManager
                connectable={{
                  ...task,
                  type: "task",
                }}
              />
            )}
          </Stack>
        </LeftSidebar.Open>
      </LeftSidebar>
      <Content>
        <Stack gap="sm" pb="50vh">
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
                  Agenda
                </Text>
              </Group>
            </Link>
          </Group>
          <Group>
            <Title
              contentEditable
              onBlur={(e) => {
                handleFieldUpdate("description", e.currentTarget.innerText);
              }}
              dangerouslySetInnerHTML={{ __html: task?.description || "" }}
            />
          </Group>
          {!!task && (
            <>
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
            </>
          )}
        </Stack>
      </Content>
      <StatusBar></StatusBar>
      <RightSidebar>
        <RightSidebar.Open>
          <Stack gap="lg">
            <Group gap="xs" wrap="nowrap">
              <Button
                radius="md"
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
                color={isComplete ? "gray.2" : "blue.7"}
                size="xs"
                fullWidth
              >
                Mark {isComplete ? "Incomplete" : "Complete"}
              </Button>
              <Menu>
                <Menu.Target>
                  <ActionIcon variant="subtle" color="gray">
                    <DotsThreeVerticalIcon weight="bold" />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    variant="light"
                    color="red"
                    onClick={handleDeleteTask}
                    disabled={loadingDelete}
                    leftSection={
                      loadingDelete ? <Loader size="xs" /> : <TrashSimpleIcon />
                    }
                  >
                    Delete Task
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
            <Divider />
            <Search
              resultActions={[
                (thing) => {
                  return {
                    id: "connect",
                    label: "Connect",
                    onClick: () => {
                      if (!task) {
                        return;
                      }
                      connect(thing.id.toString());
                    },
                    disabled: isConnected(thing.id.toString()),
                  };
                },
              ]}
            />
          </Stack>
        </RightSidebar.Open>
      </RightSidebar>
    </PageWrapper>
  );
}
