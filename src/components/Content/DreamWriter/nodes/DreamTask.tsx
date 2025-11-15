import { mergeAttributes, Node, NodeViewProps } from "@tiptap/core";
import { DOMParser, Fragment } from "@tiptap/pm/model";
import useFetch from "../../../../hooks/useFetch";
import { ITask } from "../../../../../app/database/models/task";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import styles from "./styles/DreamTask.module.scss";
import { Group, HoverCard, Text } from "@mantine/core";
import { CheckIcon } from "@phosphor-icons/react";
import { useLandscape } from "../../../../contexts/LandscapeContext";
import useConnectable from "../../../../hooks/useConnectable";
import { useEffect } from "react";
import {
  DreamTaskSchema,
  IDreamTaskOptions,
} from "../../../../../shared/editing/tiptap/nodes/DreamTask";

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

  const { data: task } = useFetch<undefined, ITask>({
    url: `/tasks/${taskId}`,
    runOnMount: !!taskId,
  });

  const {
    connectable: {
      viewing: { get: currentConnectable },
    },
  } = useLandscape();
  const { ensureConnected, loadingConnected } = useConnectable({
    connectable: currentConnectable ?? null,
  });
  useEffect(() => {
    if (task?.id) {
      ensureConnected(task.id.toString());
    }
  }, [task?.id.toString(), loadingConnected]);

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
