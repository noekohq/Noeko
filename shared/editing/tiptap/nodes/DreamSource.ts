import { Node, NodeConfig } from "@tiptap/core";
import { DOMParser, Fragment } from "@tiptap/pm/model";
import { mergeAttributes } from "@tiptap/core";

export interface IDreamSourceOptions {
  HTMLAttributes: Record<string, any>;
}

export const DreamSourceSchema = Node.create<IDreamSourceOptions>({
  name: "dreamSource",
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
      sourceId: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-source-id"),
        renderHTML: (attributes) => ({
          "data-source-id": attributes.sourceId,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-dream-source][data-source-alias]",
        getContent: (node, schema) => {
          const dom = node as HTMLElement;
          const alias = dom.getAttribute("data-source-alias");

          if (alias) {
            return Fragment.from(schema.text(alias));
          }

          return Fragment.empty;
        },
      },
      {
        tag: "span[data-dream-source][data-source-id]",
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
        "data-dream-source": "",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setDreamSource:
        (options) =>
        ({ commands }) => {
          if (!options.sourceId || !options.content) {
            return false;
          }
          return commands.insertContent({
            type: this.name,
            attrs: { sourceId: options.sourceId },
            content: [{ type: "text", text: options.content }],
          });
        },
    };
  },
});
