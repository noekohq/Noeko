import { Node } from "@tiptap/core";
import { mergeAttributes } from "@tiptap/core";

export interface IDreamImageOptions {
  HTMLAttributes: Record<string, any>;
}

export const DreamImageSchema = Node.create<IDreamImageOptions>({
  name: "dreamImage",
  group: "block",
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute("src"),
      },
      alt: {
        default: null,
        parseHTML: (element) => element.getAttribute("alt"),
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute("title"),
      },
      // Add width and height for resizing
      width: {
        default: "100%", // A sensible default
        parseHTML: (element) => element.getAttribute("width"),
        renderHTML: (attributes) => ({
          width: attributes.width,
        }),
      },
      height: {
        default: "auto",
        parseHTML: (element) => element.getAttribute("height"),
        renderHTML: (attributes) => ({
          height: attributes.height,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]:not([src^="data:"])',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes)];
  },

  addCommands() {
    return {
      setDreamImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
