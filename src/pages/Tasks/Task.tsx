import { useNavigate, useParams } from "react-router";
import { ITask, ITaskForm } from "../../../app/database/models/task";
import { IShareAccess } from "../../../app/database/models/share";
import PageWrapper from "../../components/Layout/PageWrapper";
import useFetch from "../../hooks/useFetch";
import { useCallback, useEffect, useState } from "react";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import Content from "../../components/UI/Layout/Content";
import {
  ActionIcon,
  Badge,
  Button,
  Collapse,
  Divider,
  Group,
  Loader,
  Menu,
  Space,
  Stack,
  Text,
  Title,
  Tooltip,
  UnstyledButton,
  Avatar,
} from "@mantine/core";
import {
  ArrowLeftIcon,
  CheckCircleIcon, // Added
  CircleIcon, // Added
  CloudCheckIcon,
  CloudSlashIcon,
  DotsThreeVerticalIcon,
  DownloadSimpleIcon,
  MarkdownLogoIcon,
  PushPinIcon,
  ShareNetworkIcon,
  TrashSimpleIcon,
  UniteSquareIcon,
  UserCirclePlusIcon,
} from "@phosphor-icons/react";
import DreamWriter from "../../components/Content/DreamWriter/DreamWriter";
import { useForm } from "@mantine/form";
import { Duration } from "surrealdb";
import styles from "./Task.module.scss";
import { useLayout } from "../../contexts/LayoutContext";
import { updateTask } from "../../utils/tasks";
import { useDebouncedCallback } from "@mantine/hooks";
import { showNotification } from "@mantine/notifications";
import Search from "../../components/Search/Search";
import { modals } from "@mantine/modals";
import ConnectionManager from "../../components/Display/Interactions/Connections/ConnectionManager";
import { useLandscape } from "../../contexts/LandscapeContext";
import useConnectable from "../../hooks/useConnectable";
import TagsManager from "../../components/Display/Interactions/Tags/TagsManager";
import Nav from "../../components/UI/Layout/Nav";
import TopBar from "../../components/UI/Layout/TopBar";
import { Tabs } from "../../components/UI/Layout/Utils/Tabs";
import usePins from "../../hooks/usePins";
import { downloadTextAsFile } from "../../utils/files";
import { htmlToMarkdown } from "../../../app/utils/formatting";
import HorizonSelector from "../../components/Display/Paper/Inputs/HorizonSelector";
import { fromYYYYMMDD } from "../../utils/datetime";
import { capitalize, formatDate } from "../../utils/formatting";
import PaperDrawer from "../../components/Display/Paper/PaperDrawer";
import AccessManager from "../../components/Display/Interactions/Access/AccessManager";
import {
  ICollaborationStatus,
  ICollaborator,
} from "../../hooks/useCollaboration";

function CollaborationInfo({
  status,
  members,
}: {
  status: ICollaborationStatus;
  members: ICollaborator[];
}) {
  let statusContent = null;
  switch (status) {
    case "connecting":
      statusContent = (
        <Group gap="4px" wrap="nowrap" align="center">
          <Loader size="12px" color="blue" />
          <Text size="xs" c="blue">
            Connecting...
          </Text>
        </Group>
      );
      break;
    case "synced":
      statusContent = (
        <Group gap="4px" wrap="nowrap" align="center">
          <CloudCheckIcon
            size={14}
            color="var(--mantine-color-green-6)"
            weight="bold"
          />
          <Text size="xs" c="green.6">
            All changes saved
          </Text>
        </Group>
      );
      break;
    case "disconnected":
      statusContent = (
        <Group gap="4px" wrap="nowrap" align="center">
          <CloudSlashIcon
            size={14}
            color="var(--mantine-color-red-7)"
            weight="bold"
          />
          <Text size="xs" c="red.7" fw="bold">
            You're offline
          </Text>
        </Group>
      );
      break;
    default:
      statusContent = (
        <Group gap="4px" wrap="nowrap" align="center">
          <Loader size={12} />
          <Text size="xs" c="dimmed">
            Saving...
          </Text>
        </Group>
      );
  }

  return (
    <Group gap="xs" align="center">
      {statusContent}
      {members.length > 0 && (
        <Avatar.Group>
          {members.map((collaborator) => (
            <Tooltip
              transitionProps={{ transition: "fade-up", duration: 300 }}
              label={collaborator.name}
              key={collaborator.name}
            >
              <Avatar
                color={collaborator.color}
                size="sm"
                radius="xl"
                variant="filled"
              >
                {collaborator.name
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")}
              </Avatar>
            </Tooltip>
          ))}
        </Avatar.Group>
      )}
    </Group>
  );
}

export default function Task() {
  const { taskId } = useParams();

  const {
    data: task,
    load: loadTask,
    loading: loadingTask,
  } = useFetch<
    undefined,
    ITask & { accessLevel: "owner" | IShareAccess | null }
  >({
    url: `/tasks/${taskId}`,
    dependencies: [taskId],
  });

  const isViewOnly = task?.accessLevel === "viewonly";
  const canEdit = !isViewOnly;

  useEffect(() => {
    loadTask();
  }, []);

  const [collaborationState, setCollaborationState] = useState<{
    status: ICollaborationStatus;
    members: ICollaborator[];
  } | null>(null);

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
      estimatedTime: task ? new Duration(task.estimatedTime).toString() : null,
      dueDate: task?.dueDate || null,
    },
    validate: {
      description: (value) => {
        if (!value) return "Description is required";
        if (value.length < 5)
          return "Description must be at least 5 characters";
        return null;
      },
    },
    transformValues: (v) => {
      return {
        ...v,
        estimatedTime: v.estimatedTime ? v.estimatedTime.toString() : null,
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

  const { isMobile } = useLayout();

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
      <TopBar />
      <LeftSidebar>
        <LeftSidebar.Open>
          <Space my="xs" />
          {!!task && (
            <ConnectionManager
              connectable={{
                ...task,
                type: "task",
              }}
            />
          )}
        </LeftSidebar.Open>
      </LeftSidebar>
      <Content>
        <div className={styles.taskContainer}>
          <Stack gap="sm" pb="50vh">
            <Stack>{task && <Tools task={task} reloadTask={loadTask} />}</Stack>

            <Stack gap="md">
              {/* UPDATED LAYOUT: Title-Adjacent Pattern
                 The checkbox is now next to the title.
              */}
              <Group align="flex-start" wrap="nowrap" gap="sm">
                <ActionIcon
                  variant="transparent"
                  color={isComplete ? "teal.4" : "gray.5"}
                  size="xl"
                  radius="xl"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkTask(!isComplete);
                  }}
                  mt={2} // Slight micro-adjustment to align with title text baseline
                >
                  {isComplete ? (
                    <CheckCircleIcon weight="fill" size={32} />
                  ) : (
                    <CircleIcon weight="regular" size={32} />
                  )}
                </ActionIcon>

                <Stack gap={4} style={{ flex: 1 }}>
                  <Group>
                    <Title
                      contentEditable={canEdit}
                      suppressContentEditableWarning
                      className={styles.editableTitle}
                      style={{
                        textDecoration: isComplete ? "line-through" : "none",
                        opacity: isComplete ? 0.6 : 1,
                      }}
                      onBlur={(e) => {
                        if (canEdit) {
                          handleFieldUpdate(
                            "description",
                            e.currentTarget.innerText,
                          );
                        }
                      }}
                      dangerouslySetInnerHTML={{
                        __html: task?.description || "",
                      }}
                    />
                    {isViewOnly && (
                      <Badge color="gray" variant="outline">
                        View Only
                      </Badge>
                    )}
                  </Group>
                </Stack>
              </Group>

              {!!task && (
                <>
                  <TagsManager
                    connectable={{
                      ...task,
                      type: "task",
                    }}
                    maxSuggested={2}
                  />

                  {/* The new Mad Libs / Natural Language Sentence Component */}
                  <TaskSentence
                    date={taskForm.values.dueDate}
                    duration={taskForm.values.estimatedTime}
                    onChange={(field, val) => handleFieldUpdate(field, val)}
                    readOnly={!canEdit}
                  />

                  {collaborationState && (
                    <Group mt="xs">
                      <CollaborationInfo
                        status={collaborationState.status}
                        members={collaborationState.members}
                      />
                    </Group>
                  )}

                  {/* REMOVED: The large "Mark Complete" button block was here */}
                </>
              )}
            </Stack>

            <Divider label="Notes" labelPosition="center" color="dark.6" />

            {!!task && (
              <>
                <DreamWriter
                  initialContent={canEdit ? undefined : task.scratchpad}
                  readOnly={!task || !canEdit}
                  collaborationId={canEdit ? task.id.toString() : undefined}
                  connectableId={isViewOnly ? undefined : task.id.toString()}
                  onStateChange={({ collaboration }) => {
                    setCollaborationState((prev) => {
                      if (!prev) return collaboration;
                      if (
                        prev.status === collaboration.status &&
                        prev.members.length === collaboration.members.length &&
                        prev.members.every(
                          (member, i) =>
                            member.name === collaboration.members[i].name,
                        )
                      ) {
                        return prev;
                      }
                      return collaboration;
                    });
                  }}
                />
              </>
            )}
          </Stack>
        </div>
      </Content>
      <Nav />
      <RightSidebar>
        <RightSidebar.Open>
          <Tabs defaultValue="search">
            <Tabs.List>
              <Tabs.Tab value="search">Search</Tabs.Tab>
              <Tabs.Tab value="sharing" leftSection={<ShareNetworkIcon />}>
                Sharing
              </Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="search">
              <Stack gap="lg">
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
            </Tabs.Panel>
            <Tabs.Panel value="sharing">
              {task && (
                <AccessManager
                  connectable={{
                    ...task,
                    type: "task",
                  }}
                />
              )}
            </Tabs.Panel>
          </Tabs>
        </RightSidebar.Open>
      </RightSidebar>
    </PageWrapper>
  );
}

// --- The New Natural Language Component ---

interface ITaskSentence {
  date: string | null;
  duration: string | null;
  onChange: (field: "dueDate" | "estimatedTime", value: any) => void;
  readOnly: boolean;
}

function TaskSentence({ date, duration, onChange, readOnly }: ITaskSentence) {
  const [activeSelector, setActiveSelector] = useState<
    "date" | "duration" | null
  >(null);

  // Helpers to format the "Variables" in the sentence
  const displayDuration = duration ? duration.toString() : "time estimate";
  const displayDate = date
    ? capitalize(formatDate(fromYYYYMMDD(date))) // "Tomorrow", "Next Friday"
    : "target date";

  // Auto-collapse handler
  const handleSelection = (field: "dueDate" | "estimatedTime", val: any) => {
    onChange(field, val);
    // Small delay to let user see the selection happen before hiding
    setTimeout(() => {
      setActiveSelector(null);
    }, 300);
  };

  const toggle = (mode: "date" | "duration") => {
    if (readOnly) return;
    setActiveSelector((current) => (current === mode ? null : mode));
  };

  return (
    <Stack gap="xs">
      {/* The Sentence */}
      <Group gap={6} wrap="wrap">
        <Text size="sm" c="dark.2">
          Should take
        </Text>

        <UnstyledButton
          onClick={() => toggle("duration")}
          disabled={readOnly}
          style={{ cursor: readOnly ? "default" : "pointer" }}
        >
          <Text
            size="sm"
            fw={duration ? 700 : 500}
            td="underline"
            c="dark.1"
            style={{ textUnderlineOffset: 4, textDecorationStyle: "dashed" }}
          >
            {displayDuration}.
          </Text>
        </UnstyledButton>

        <Text size="sm" c="dark.2">
          Done by
        </Text>

        <UnstyledButton
          onClick={() => toggle("date")}
          disabled={readOnly}
          style={{ cursor: readOnly ? "default" : "pointer" }}
        >
          <Text
            size="sm"
            fw={date ? 700 : 500}
            td="underline"
            c={"dark.1"}
            style={{ textUnderlineOffset: 4, textDecorationStyle: "dashed" }}
          >
            {displayDate}.
          </Text>
        </UnstyledButton>
      </Group>

      {/* The Progressive Disclosure Area */}
      <Collapse in={!!activeSelector} transitionDuration={200}>
        {activeSelector === "duration" && (
          <HorizonSelector
            type="duration"
            value={duration}
            onChange={(val) => {
              if (val) handleSelection("estimatedTime", new Duration(val));
              else onChange("estimatedTime", null);
            }}
          />
        )}
        {activeSelector === "date" && (
          <HorizonSelector
            type="date"
            value={date}
            onChange={(val) => {
              handleSelection("dueDate", val);
            }}
          />
        )}
      </Collapse>
    </Stack>
  );
}

// --- The Tools Component (Refactored for Top Bar) ---

interface ITools {
  task: ITask;
  reloadTask: () => void;
}

function Tools({ task, reloadTask }: ITools) {
  const { isMobile } = useLayout();
  const navigate = useNavigate();

  const { load: triggerDeleteTask, loading: loadingDelete } = useFetch({
    url: `/tasks/${task.id.toString()}`,
    dependencies: [task.id.toString()],
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
        message: `There was an error deleting the task: ${
          error?.response?.data?.message || error?.message || "Unknown error"
        }`,
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
  }, [loadingDelete, triggerDeleteTask, task.id.toString()]);

  const getMarkdownContent = () => {
    if (!task?.scratchpad) {
      return "";
    }
    return htmlToMarkdown(task?.scratchpad);
  };

  const downloadAsMarkdown = () => {
    if (task?.scratchpad) {
      const markdown = getMarkdownContent();
      downloadTextAsFile(markdown, {
        type: "text/markdown",
        extension: "md",
        name: task.description,
      });
    }
  };

  const { thingIsPinned, togglePin } = usePins();
  const [pinning, setPinning] = useState(false);
  const isPinned = thingIsPinned(task.id);

  const handleTogglePin = async () => {
    try {
      setPinning(true);
      await togglePin(task.id.toString());
    } catch (error) {
      console.error("Error toggling pin:", error);
    } finally {
      setPinning(false);
    }
  };

  const size = isMobile ? "lg" : "md";
  const radius = "md";

  const handleBack = () => {
    navigate(-1);
  };

  const [managingConnections, setManagingConnections] = useState(false);
  const [managingAccess, setManagingAccess] = useState(false);

  return (
    <>
      <Group justify="space-between" wrap="nowrap" mb="lg">
        <Group wrap="nowrap">
          <ActionIcon
            onClick={handleBack}
            color="gray"
            variant="subtle"
            size={size}
            radius={radius}
          >
            <ArrowLeftIcon weight="bold" />
          </ActionIcon>
        </Group>
        <Group wrap="nowrap">
          <ActionIcon
            onClick={() => {
              if (pinning) return;
              handleTogglePin();
            }}
            aria-label={isPinned ? "Unpin" : "Pin"}
            size={size}
            radius={radius}
            variant="subtle"
            color="gray"
          >
            <PushPinIcon weight={isPinned ? "fill" : "bold"} />
          </ActionIcon>

          {isMobile && (
            <>
              <ActionIcon
                aria-label="Manage connections"
                size={size}
                radius={radius}
                variant="subtle"
                color="gray"
                onClick={() => setManagingConnections(true)}
              >
                <UniteSquareIcon />
              </ActionIcon>

              <ActionIcon
                aria-label="Manage access"
                size={size}
                radius={radius}
                variant="subtle"
                color="gray"
                onClick={() => setManagingAccess(true)}
              >
                <UserCirclePlusIcon weight="fill" />
              </ActionIcon>
            </>
          )}

          <Menu
            width={300}
            shadow="md"
            position="bottom-end"
            radius={radius}
            withArrow
            arrowOffset={14}
            zIndex={700}
          >
            <Menu.Target>
              <div>
                <ActionIcon
                  size={size}
                  aria-label="Download"
                  radius={radius}
                  variant="subtle"
                  color="gray"
                >
                  <DownloadSimpleIcon weight="bold" />
                </ActionIcon>
              </div>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<MarkdownLogoIcon />}
                onClick={downloadAsMarkdown}
              >
                Export as Markdown
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>

          <Menu
            width={300}
            shadow="md"
            position="bottom-end"
            radius={radius}
            withArrow
            arrowOffset={14}
            zIndex={700}
          >
            <Menu.Target>
              <div>
                <ActionIcon
                  aria-label="More options"
                  size={size}
                  radius={radius}
                  variant="subtle"
                  color="gray"
                >
                  <DotsThreeVerticalIcon weight="bold" />
                </ActionIcon>
              </div>
            </Menu.Target>

            <Menu.Dropdown>
              <Tooltip label="Delete Task">
                <Menu.Item
                  color="red"
                  leftSection={
                    loadingDelete ? <Loader size="xs" /> : <TrashSimpleIcon />
                  }
                  onClick={handleDeleteTask}
                  disabled={loadingDelete}
                >
                  Delete
                </Menu.Item>
              </Tooltip>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

      <PaperDrawer
        title="Manage Connections"
        opened={managingConnections}
        onClose={() => setManagingConnections(false)}
      >
        <ConnectionManager
          connectable={{
            ...task,
            type: "task",
          }}
        />
      </PaperDrawer>

      <PaperDrawer
        title="Manage Access"
        opened={managingAccess}
        onClose={() => setManagingAccess(false)}
      >
        <AccessManager
          connectable={{
            ...task,
            type: "task",
          }}
        />
      </PaperDrawer>
    </>
  );
}
