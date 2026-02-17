import { Node, NodeConfig, mergeAttributes } from "@tiptap/core";

export interface IDreamTableOptions {
  HTMLAttributes: Record<string, any>;
}

export interface ITableDataType {
  headers: string[];
  rows: string[][];
}

export const initializeTableData = (columns: number, rows: number): ITableDataType => {
  return {
    headers: Array(columns > 0 ? columns : 1)
      .fill("")
      .map((_, i) => `Header ${i + 1}`),
    rows: Array(rows > 0 ? rows : 1)
      .fill(null)
      .map(() => Array(columns > 0 ? columns : 1).fill("")),
  };
};

export const DreamTableSchema = Node.create({
  name: "dreamTable",
  group: "block",
  inline: false,
  atom: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      tableData: {
        default: JSON.stringify(initializeTableData(2, 2)),
        parseHTML: (element) => element.getAttribute("data-table-data"),
        renderHTML: (attributes) => ({
          "data-table-data": attributes.tableData,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-table-data]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": this.name,
      }),
    ];
  },

  addCommands() {
    return {
      setDreamTable:
        (options) =>
        ({ commands }) => {
          const initialData = initializeTableData(options.columns, options.rows);
          return commands.insertContent(
            `<div data-type="${this.name}" data-table-data='${JSON.stringify(initialData)}'></div>`
          );
        },
    };
  },
});
