import { Mark, mergeAttributes } from "@tiptap/core";
import styles from "./styles/DreamHighlight.module.scss";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dreamHighlight: {
      /**
       * Set the highlight mark
       */
      setDreamHighlight: () => ReturnType;
      /**
       * Unset the highlight mark
       */
      unsetDreamHighlight: () => ReturnType;
      /**
       * Toggle the highlight mark
       */
      toggleDreamHighlight: () => ReturnType;
    };
  }
}

export interface DreamHighlightOptions {
  HTMLAttributes: Record<string, any>;
}

export const DreamHighlight = Mark.create<DreamHighlightOptions>({
  name: "dreamHighlight",

  addOptions() {
    return {
      HTMLAttributes: {
        // You can add default attributes here
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span",
        getAttrs: (element) => {
          if (typeof element === "string") {
            return false;
          }
          if (element.classList.contains(styles.dreamHighlight)) {
            return {};
          }
          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: styles.dreamHighlight,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setDreamHighlight:
        () =>
        ({ commands }) => {
          return commands.setMark(this.name);
        },
      unsetDreamHighlight:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
      toggleDreamHighlight:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
    };
  },
});
