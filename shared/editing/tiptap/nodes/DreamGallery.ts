import { Node, mergeAttributes } from "@tiptap/core";

export interface IDreamGalleryOptions {
  HTMLAttributes: Record<string, any>;
}

export const DreamGallerySchema = Node.create<IDreamGalleryOptions>({
  name: "dreamGallery",
  group: "block",
  content: "dreamImage+",
  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="dreamGallery"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "dreamGallery",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setDreamGallery:
        () =>
        ({ commands }) => {
          return commands.wrapIn(this.name);
        },
    };
  },
});
