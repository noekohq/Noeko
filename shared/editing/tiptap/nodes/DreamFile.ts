import { Node } from "@tiptap/core";
import { NodeConfig } from "@tiptap/core";
import { mergeAttributes } from "@tiptap/core";

export interface IDreamFileOptions {
  HTMLAttributes: Record<string, any>;
}

export const DreamFileSchema = Node.create<IDreamFileOptions>({
  name: "dreamFile",
  group: "block",
  atom: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      fileId: {
        default: "",
        // Parse from data-file-id attribute
        parseHTML: (element) => element.getAttribute("data-file-id"),
        // Render as data-file-id attribute
        renderHTML: (attributes) => ({ "data-file-id": attributes.fileId }),
        // Keep this attribute when pasting HTML
        keepOnSplit: false,
      },
      fileName: {
        default: "Untitled File",
        parseHTML: (element) => element.getAttribute("data-file-name"),
        renderHTML: (attributes) => ({ "data-file-name": attributes.fileName }),
        keepOnSplit: false,
      },
      fileType: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-file-type"), // Corrected: parse from data-file-type
        renderHTML: (attributes) => ({ "data-file-type": attributes.fileType }),
        keepOnSplit: false,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-dream-file][data-file-id][data-file-name]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-dream-file": "", // Add a specific marker
      }),
    ];
  },

  addCommands() {
    return {
      setDreamFile:
        (options) =>
        ({ commands }) => {
          if (!options.fileId || !options.fileName) {
            console.error("Cannot set file link without fileId and filename");
            return false;
          }
          // Ensure fileType is at least null or an empty string if not provided
          const attrs = {
            fileId: options.fileId,
            fileName: options.fileName,
            fileType: options.fileType ?? null,
          };
          return commands.insertContent({
            type: this.name,
            attrs: attrs,
          });
        },
    };
  },
});
