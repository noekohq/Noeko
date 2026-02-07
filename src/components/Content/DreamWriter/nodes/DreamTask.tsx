import {
  ArrowRightIcon,
  ArrowSquareOutIcon,
  CheckIcon,
  ShieldSlashIcon,
  TrashIcon,
  TrashSimpleIcon,
} from "@phosphor-icons/react";
import { Editor as IEditor } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewProps,
  NodeViewWrapper,
  NodeViewContent,
} from "@tiptap/react";
import styles from "./styles/DreamTask.module.scss";
import {
  ActionIcon,
  Flex,
  Group,
  Popover,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { Link, useNavigate } from "react-router";
import useFetch from "../../../../hooks/useFetch";
import { ITask } from "../../../../../app/database/models/task";
import { DreamTaskSchema } from "../../../../../shared/editing/tiptap/nodes/DreamTask";
import { useEffect, useState } from "react";
import { useDisclosure } from "@mantine/hooks";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dreamTask: {
      setDreamTask: (options: {
        taskId: string;
        content: string;
      }) => ReturnType;
    };
  }
}

export const DreamTask = DreamTaskSchema.extend({
  addNodeView() {
    return ReactNodeViewRenderer(DreamTaskComponent, {
      contentDOMElementTag: "span",
    });
  },
});

export const DreamTaskComponent: React.FC<NodeViewProps> = ({
  node,
  deleteNode,
  selected,
}) => {
  const { taskId } = node.attrs;
  const isEmpty = node.content.size === 0;
  const [accessState, setAccessState] = useState<
    "granted" | "forbidden" | "error"
  >("granted");
  const navigate = useNavigate();

  const { data: task, load: fetchTask } = useFetch<undefined, ITask>({
    url: `/tasks/${taskId}`,
    skip403Redirect: true,
    onError: (error) => {
      console.error("Error getting task to connect: ", error);
      if ((error as any)?.response?.status === 403) {
        setAccessState("forbidden");
      } else {
        setAccessState("error");
      }
    },
  });

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  const [iconHovered, { toggle }] = useDisclosure(false);

  const handleLinkClick = (event: React.MouseEvent<HTMLSpanElement>) => {
    event.preventDefault();
    // Standard behavior for opening in a new tab
    if (event.metaKey || event.ctrlKey) {
      window.open(`/task/${taskId}`, "_blank");
      return;
    }
    navigate(`/task/${taskId}`);
  };

  const getTooltipLabel = () => {
    switch (accessState) {
      case "granted":
        return task?.description ? `Preview ${task.description}` : "Loading...";
      case "forbidden":
        return "You don't have access to preview this task";
      case "error":
        return "Could not load task preview";
      default:
        return "Loading...";
    }
  };

  if (!taskId) {
    return <span className={styles.dreamTaskError}>[ERROR]</span>;
  }

  return (
    <NodeViewWrapper
      as="span"
      className={styles.dreamTaskWrapper}
      data-selected={selected || undefined}
    >
      <Popover
        width={"400px"}
        shadow="md"
        position="top"
        radius="lg"
        opened={iconHovered}
      >
        <Popover.Target>
          <Tooltip label={getTooltipLabel()}>
            <Flex
              className={styles.iconWrapper}
              align={"center"}
              justify={"center"}
              onClick={() => {
                toggle();
              }}
            >
              {accessState === "granted" ? (
                <CheckIcon
                  className={`${styles.dreamTaskIcon} ${
                    iconHovered ? styles.hovered : ""
                  }`}
                  weight={iconHovered ? "fill" : "regular"}
                />
              ) : (
                <ShieldSlashIcon
                  className={`${styles.dreamTaskIcon} ${styles.shieldIcon}`}
                  weight="fill"
                />
              )}
            </Flex>
          </Tooltip>
        </Popover.Target>

        <Popover.Dropdown
          onClick={(e) => e.stopPropagation()}
          style={{ overflowY: "scroll", maxHeight: "400px" }}
        >
          {accessState === "granted" && task && (
            <Stack gap="sm">
              <Group
                justify="space-between"
                align="center"
                w={"100%"}
                wrap="nowrap"
              >
                <Text fw={500} c="dark.3">
                  {task.description}
                </Text>
                <Group justify="flex-end">
                  <ActionIcon
                    onClick={deleteNode}
                    variant="light"
                    color="gray"
                    size="sm"
                    radius="sm"
                  >
                    <TrashSimpleIcon weight="bold" size={12} />
                  </ActionIcon>
                  <Link to={`/task/${taskId}`}>
                    <ActionIcon
                      title="Open Task"
                      variant="light"
                      color="gray"
                      size="sm"
                      radius="sm"
                    >
                      <ArrowRightIcon weight="bold" size={12} />
                    </ActionIcon>
                  </Link>
                </Group>
              </Group>
              {task.scratchpad && (
                <div
                  dangerouslySetInnerHTML={{
                    __html: task.scratchpad,
                  }}
                />
              )}
            </Stack>
          )}

          {accessState === "granted" && !task && (
            <Text c="dimmed" size="xs">
              Loading preview...
            </Text>
          )}

          {accessState === "forbidden" && (
            <Stack gap="sm" align="center">
              <ShieldSlashIcon
                size={32}
                weight="regular"
                color="var(--mantine-color-dimmed)"
              />
              <Text c="dimmed" size="sm" ta="center">
                You don't have access to preview this task
              </Text>
              <Link to={`/task/${taskId}`}>
                <ActionIcon
                  title="Request Access"
                  variant="light"
                  color="gray"
                  size="md"
                  radius="md"
                >
                  <ArrowRightIcon weight="bold" size={12} />
                </ActionIcon>
              </Link>
            </Stack>
          )}

          {accessState === "error" && (
            <Stack gap="sm" align="center">
              <Text c="dimmed" size="sm" ta="center">
                Could not load task preview.
              </Text>
            </Stack>
          )}
        </Popover.Dropdown>
      </Popover>

      <span
        onClick={handleLinkClick}
        className={styles.dreamTaskInline}
        role="link"
      >
        <NodeViewContent
          className={`${styles.dreamTaskContent} ${
            !task && accessState === "granted" ? styles.notFound : ""
          }`}
          data-placeholder={
            isEmpty ? task?.description || "Loading task..." : undefined
          }
          title={
            task?.description ? `Go to "${task.description}"` : "Go to task"
          }
        />
      </span>
    </NodeViewWrapper>
  );
};

interface IDreamTaskMenuProps {
  editor: IEditor;
}

export const DreamTaskMenu = ({ editor }: IDreamTaskMenuProps) => {
  const deleteSelectedNode = () => {
    editor.chain().focus().deleteNode("dreamTask").run();
  };

  const taskId = editor.getAttributes("dreamTask").taskId;

  return (
    <>
      <Link to={`/task/${taskId}`}>
        <ActionIcon title="Open Task">
          <ArrowSquareOutIcon />
        </ActionIcon>
      </Link>
      <ActionIcon title="Delete Task" color="red" onClick={deleteSelectedNode}>
        <TrashIcon />
      </ActionIcon>
    </>
  );
};
