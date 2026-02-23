import { Mark, mergeAttributes } from "@tiptap/core";
import styles from '@core/design/styles/DreamHighlight.module.scss';
import {
  DreamHighlightSchema,
  IDreamHighlightOptions,
} from '../../../shared/editing/tiptap/marks/DreamHighlight';

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

export const DreamHighlight = DreamHighlightSchema.extend({
  ...DreamHighlightSchema,
}).extend({
  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-dream-highlight": "",
        class: styles.dreamHighlight,
      }),
      0,
    ];
  },
});
