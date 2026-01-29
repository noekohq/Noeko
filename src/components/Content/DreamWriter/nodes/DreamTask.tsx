import { NodeViewProps } from "@tiptap/core";
import { useEffect } from "react";
import useFetch from "../../../../hooks/useFetch";
import { ITask } from "../../../../../app/database/models/task";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import styles from "./styles/DreamTask.module.scss";
import { Group, Text } from "@mantine/core";
import { CheckIcon } from "@phosphor-icons/react";
import { DreamTaskSchema } from "../../../../../shared/editing/tiptap/nodes/DreamTask";

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
  editor,
  node,
  deleteNode,
  selected,
  extension,
}) => {
  const { taskId } = node.attrs;
  const isEditable = extension.options.editable as boolean;
  const isEmpty = node.content.size === 0;

  const { data: task, load: fetchTask } = useFetch<undefined, ITask>({
    url: `/tasks/${taskId}`,
  });

  useEffect(() => {
    if (isEditable) {
      fetchTask();
    }
  }, [isEditable]);

  if (!taskId) {
    return <span className={styles.dreamTaskError}>[ERROR]</span>;
  }

  return (
    <NodeViewWrapper
      as="span"
      className={styles.dreamTaskInline}
      data-selected={selected || undefined}
    >
      <Text>
        <Group gap="xs">
          <CheckIcon weight="bold" />
          <NodeViewContent
            className={styles.dreamTaskContent}
            data-placeholder={
              isEmpty ? task?.description || "Loading task..." : undefined
            }
          />
        </Group>
      </Text>
    </NodeViewWrapper>
  );
};
