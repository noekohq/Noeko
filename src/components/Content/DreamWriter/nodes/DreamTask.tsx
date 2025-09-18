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
import { IConnectable } from "../../../../../app/services/Graph";
import { useEffect } from "react";

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
  name: "dreamTask",
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
        tag: "span[data-dream-task][data-task-alias]",
        getContent: (node, schema) => {
          const dom = node as HTMLElement;
          const alias = dom.getAttribute("data-task-alias");

          if (alias) {
            return Fragment.from(schema.text(alias));
          }

          return Fragment.empty;
        },
      },
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
