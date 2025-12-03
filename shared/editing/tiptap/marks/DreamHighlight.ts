import { Mark } from "@tiptap/core";
import { MarkConfig, mergeAttributes } from "@tiptap/core";

export interface IDreamHighlightOptions {
  HTMLAttributes: Record<string, any>;
}

export const DreamHighlightSchema = Mark.create<IDreamHighlightOptions>({
  name: "dreamHighlight",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-dream-highlight]",
      },
      {
        tag: "span",
        getAttrs: (node) => node.classList.contains("dream-highlight") && null,
      },
    ];
  },

  renderHTML({ HTMLAttributes }: any) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-dream-highlight": "", // This marks it as a highlight in the DB
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setDreamHighlight:
        () =>
        ({ commands }: any) =>
          commands.setMark(this.name),
      unsetDreamHighlight:
        () =>
        ({ commands }: any) =>
          commands.unsetMark(this.name),
      toggleDreamHighlight:
        () =>
        ({ commands }: any) =>
          commands.toggleMark(this.name),
    };
  },
});
