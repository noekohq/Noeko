import { Extension } from "@tiptap/core";
import {
  DreamIndentSchema,
  IIndentOptions,
} from "../../../shared/editing/tiptap/extensions/DreamIndent";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    indent: {
      /**
       * Indent the selected nodes.
       */
      indent: () => ReturnType;
      /**
       * Outdent the selected nodes.
       */
      outdent: () => ReturnType;
    };
  }
}

export const Indent = DreamIndentSchema.extend({
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (this.editor.isActive("listItem")) {
          return this.editor.commands.sinkListItem("listItem");
        } else if (this.editor.isActive("taskItem")) {
          return this.editor.commands.sinkListItem("taskItem");
        }
        return this.editor.commands.indent();
      },
      "Shift-Tab": () => {
        if (this.editor.isActive("listItem")) {
          return this.editor.commands.liftListItem("listItem");
        } else if (this.editor.isActive("taskItem")) {
          return this.editor.commands.liftListItem("taskItem");
        }
        return this.editor.commands.outdent();
      },
      Backspace: () => {
        const { $head } = this.editor.state.selection;
        const node = $head.parent;
        if (node.attrs.indent > 0) {
          return this.editor.commands.outdent();
        }
        return false;
      },
    };
  },
});
