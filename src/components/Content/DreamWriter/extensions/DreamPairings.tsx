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

export const DreamPairings = Extension.create({
  name: "autoPairedBrackets",

  addInputRules() {
    return [
      createPairedBracketRule("(", ")"),
      createPairedBracketRule("[", "]"),
      createPairedBracketRule("{", "}"),
    ];
  },
});

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
