import { mergeAttributes, Node, NodeViewProps } from "@tiptap/core";
import { DOMParser } from "@tiptap/pm/model";
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

export const DreamTask = Node.create({
  id: "dreamTask",
  group: "inline",
  inline: true,
  draggable: true,
  content: "text*",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      taskId: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-task-id"),
        renderHTML: (attributes) => ({
          "data-task-id": attributes.taskId,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-dream-task][data-task-id]",
        getContent: (node, schema) => {
          const dom = node as HTMLElement;
          return DOMParser.fromSchema(schema).parseSlice(dom).content;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-dream-task": "",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setDreamTask:
        (options) =>
        ({ commands }) => {
          if (!options.taskId || !options.content) {
            return false;
          }
          return commands.insertContent({
            type: this.name,
            attrs: {
              taskId: options.taskId,
            },
            content: [
              {
                type: "text",
                text: options.content,
              },
            ],
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(DreamTaskComponent);
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
            as="span"
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
