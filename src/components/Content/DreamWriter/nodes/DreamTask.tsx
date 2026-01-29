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
import { ActionIcon, Flex, Group, Popover, Stack, Text } from "@mantine/core";
import { Link } from "react-router";
import useFetch from "../../../../hooks/useFetch";
import { ITask } from "../../../../../app/database/models/task";
import { DreamTaskSchema } from "../../../../../shared/editing/tiptap/nodes/DreamTask";
import { useEffect, useState } from "react";

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
  extension,
}) => {
  const { taskId } = node.attrs;

  const isEmpty = node.content.size === 0;
  const [hasAccess, setHasAccess] = useState(true);

  const { data: task, load: fetchTask } = useFetch<undefined, ITask>({
    url: `/tasks/${taskId}`,
    skip403Redirect: true,
    onError: (error) => {
      console.error("Error getting task to connect: ", error);
      if ((error as any)?.response?.status === 403) {
        setHasAccess(false);
      }
    },
  });

  useEffect(() => {
    fetchTask();
  }, []);

  if (!taskId) {
    return <span className={styles.dreamTaskError}>[ERROR]</span>;
  }

  return (
    <NodeViewWrapper
      as="span"
      className={styles.dreamTaskWrapper}
      data-selected={selected || undefined}
    >
      <Popover width={"400px"} shadow="md" position="top" radius="lg">
        <Popover.Target>
          <Flex align={"center"} justify={"center"}>
            {hasAccess ? (
              <CheckIcon
                className={styles.dreamTaskIcon}
                weight="bold"
              />
            ) : (
              <ShieldSlashIcon
                className={styles.dreamTaskIcon}
                weight="regular"
              />
            )}
          </Flex>
        </Popover.Target>

        <Popover.Dropdown
          onClick={(e) => e.stopPropagation()}
          style={{ overflowY: "scroll", maxHeight: "400px" }}
        >
          {task ? (
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
          ) : !hasAccess ? (
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
          ) : (
            <Text c="dimmed" size="xs">
              Could not find task :/
            </Text>
          )}
        </Popover.Dropdown>
      </Popover>

      <Link
        to={`/task/${task?.id.toString()}`}
        className={styles.dreamTaskInline}
      >
        <NodeViewContent
          className={`${styles.dreamTaskContent} ${!task ? styles.notFound : ""}`}
          data-placeholder={
            isEmpty ? task?.description || "Loading task..." : undefined
          }
          title={`Go to "${task?.description}"`}
        />
      </Link>
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
