import { Extension } from "@tiptap/core";
import { ExtensionConfig } from "@tiptap/core";
import { TextSelection, AllSelection, Transaction } from "prosemirror-state";

export interface IIndentOptions {
  types: string[];
  indentLevels: number[];
  defaultIndentLevel: number;
}

const updateIndentLevel = (tr: Transaction, delta: number, types: string[]): Transaction => {
  const { doc, selection } = tr;

  if (!doc || !selection) {
    return tr;
  }

  if (!(selection instanceof TextSelection || selection instanceof AllSelection)) {
    return tr;
  }

  const { from, to } = selection;

  doc.nodesBetween(from, to, (node, pos) => {
    if (types.includes(node.type.name)) {
      const indent = (node.attrs.indent || 0) + delta;

      if (indent >= 0) {
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          indent,
        });
      }
    }
  });

  return tr;
};

export const DreamIndentSchema = Extension.create({
  name: "indent",

  addOptions() {
    return {
      types: ["paragraph", "heading", "listItem"],
      indentLevels: [0, 20, 40, 60, 80, 100, 120],
      defaultIndentLevel: 0,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: this.options.defaultIndentLevel,
            renderHTML: (attributes) => {
              if (attributes.indent > 0) {
                return {
                  style: `margin-left: ${attributes.indent * 20}px`,
                };
              }
              return {};
            },
            parseHTML: (element) =>
              parseInt(element.style.marginLeft, 10) || this.options.defaultIndentLevel,
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      indent:
        () =>
        ({ tr, dispatch }) => {
          const { selection } = tr;
          tr = tr.setSelection(selection);
          tr = updateIndentLevel(tr, 1, this.options.types);

          if (tr.docChanged) {
            dispatch?.(tr);
            return true;
          }

          return false;
        },
      outdent:
        () =>
        ({ tr, dispatch }) => {
          const { selection } = tr;
          tr = tr.setSelection(selection);
          tr = updateIndentLevel(tr, -1, this.options.types);

          if (tr.docChanged) {
            dispatch?.(tr);
            return true;
          }

          return false;
        },
    };
  },
});
