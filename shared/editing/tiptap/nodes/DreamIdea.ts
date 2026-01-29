import { DOMParser, Fragment } from "@tiptap/pm/model";
import { mergeAttributes, Node } from "@tiptap/core";

export interface IDreamIdeaOptions {
  HTMLAttributes: Record<string, any>;
  editable: boolean;
}

export const DreamIdeaSchema = Node.create<IDreamIdeaOptions>({
  name: "dreamIdea",
  group: "inline",
  inline: true,
  draggable: true,
  content: "text*",

  addOptions() {
    return {
      HTMLAttributes: {},
      editable: false,
    };
  },

  addAttributes() {
    return {
      ideaId: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-idea-id"),
        renderHTML: (attributes) => ({ "data-idea-id": attributes.ideaId }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-dream-idea][data-idea-alias]",
        getContent: (node, schema) => {
          const dom = node as HTMLElement;
          const alias = dom.getAttribute("data-idea-alias");

          if (alias) {
            return Fragment.from(schema.text(alias));
          }

          return Fragment.empty;
        },
      },
      {
        tag: "span[data-dream-idea][data-idea-id]",
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
        "data-dream-idea": "",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setDreamIdea:
        (options) =>
        ({ commands }) => {
          if (!options.ideaId || !options.content) {
            return false;
          }
          return commands.insertContent({
            type: this.name,
            attrs: { ideaId: options.ideaId },
            content: [{ type: "text", text: options.content }],
          });
        },
    };
  },
});
