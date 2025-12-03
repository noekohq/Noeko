import { Extension, InputRule } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

const createPairedBracketRule = (openChar: string, closeChar: string) => {
  return new InputRule({
    find: new RegExp(`\\B${escapeRegExp(openChar)}$`),
    handler: ({ state, range }) => {
      const { tr, selection } = state;

      if (!selection.empty) {
        const { from, to } = selection;
        const selectedText = state.doc.textBetween(from, to);

        tr.insertText(openChar + selectedText + closeChar, from, to);

        tr.setSelection(TextSelection.create(tr.doc, from + 1, to + 1));
      } else {
        const { from, to } = range;
        tr.insertText(openChar + closeChar, from, to);
        tr.setSelection(TextSelection.create(tr.doc, from + 1));
      }
    },
  });
};

const latexInputRule = new InputRule({
  // 1. Find two dollar signs. No \B needed.
  find: /\$\$/,

  // 2. Use a clearer handler that explicitly deletes and inserts.
  handler: ({ range, commands }) => {
    // Delete the '$$' that the user typed
    commands.deleteRange(range);

    // Insert the empty math node at that position
    commands.insertContent({
      type: "inlineMath", // Use the registered name of your node
      attrs: {
        latex: "", // Start with empty content
      },
    });
  },
});

const latexBlockInput = new InputRule({
  find: new RegExp(`\\B\\$\\$\\$`),
  handler: ({ state, range }) => {
    const { tr } = state;
    const { from, to } = range;

    tr.insertText("\\begin{equation*}\n\n\\end{equation*}", from, to);
    tr.setSelection(TextSelection.create(tr.doc, from + 1));
  },
});

export const DreamInputs = Extension.create({
  name: "dreamInputs",

  addInputRules() {
    return [
      createPairedBracketRule("(", ")"),
      createPairedBracketRule("[", "]"),
      createPairedBracketRule("{", "}"),
      latexInputRule,
    ];
  },

  addKeyboardShortcuts() {
    const createOverwriteRule = (char: string) => () => {
      const { state } = this.editor;
      const { selection } = state;

      if (!selection.empty) {
        return false;
      }

      const { $head } = selection;
      const pos = $head.pos;
      const nextChar = state.doc.textBetween(pos, pos + 1);

      if (nextChar === char) {
        // Use the built-in command to move the cursor.
        // This command returns `true` if it was successful.
        return this.editor.commands.setTextSelection(pos + 1);
      }

      return false;
    };

    return {
      ")": createOverwriteRule(")"),
      "]": createOverwriteRule("]"),
      "}": createOverwriteRule("}"),
    };
  },
});

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
