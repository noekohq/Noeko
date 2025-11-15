import { NodeConfig } from "@tiptap/core";
import { DOMParser, Fragment } from "@tiptap/pm/model";
import { mergeAttributes } from "@tiptap/core";
import { Node } from "@tiptap/core";

export interface IDreamTaskOptions {
  HTMLAttributes: Record<string, any>;
}

export const DreamTaskSchema = Node.create<IDreamTaskOptions>({
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
});
