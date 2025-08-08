import { Extension, InputRule } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

const createPairedBracketRule = (openChar: string, closeChar: string) => {
  return new InputRule({
    find: new RegExp(`\\B${escapeRegExp(openChar)}$`),
    handler: ({ state, range }) => {
      const { tr } = state;
      const { from, to } = range;

      tr.insertText(openChar + closeChar, from, to);
      tr.setSelection(TextSelection.create(tr.doc, from + 1));
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
});

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
