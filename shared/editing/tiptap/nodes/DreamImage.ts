import { Node, mergeAttributes } from "@tiptap/core";

export interface IDreamImageOptions {
  HTMLAttributes: Record<string, any>;
}

export const DreamImageSchema = Node.create<IDreamImageOptions>({
  name: "dreamImage",
  group: "block",
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute("src"),
      },
      alt: {
        default: null,
        parseHTML: (element) => element.getAttribute("alt"),
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute("title"),
      },
      width: {
        default: "100%",
        parseHTML: (element) => element.getAttribute("width"),
        renderHTML: (attributes) => ({
          width: attributes.width,
        }),
      },
      height: {
        default: "auto",
        parseHTML: (element) => element.getAttribute("height"),
        renderHTML: (attributes) => ({
          height: attributes.height,
        }),
      },
      fileId: {
        default: null,
        parseHTML: (element) => {
          // 1. Primary: Check for the clean attribute
          const dataId = element.getAttribute("data-file-id");
          if (dataId) return dataId;

          // 2. Migration Fallback: Extract from legacy URL structure
          // This runs ONLY if data-file-id is missing (old content)
          const src = element.getAttribute("src");
          if (src && src.includes("/api/files/")) {
            const match = src.match(/\/api\/files\/(user_file:[^/]+)\/stream/);
            if (match && match[1]) {
              return match[1];
            }
          }
          return null;
        },
        renderHTML: (attributes) => {
          if (!attributes.fileId) return {};
          return { "data-file-id": attributes.fileId };
        },
      },
      viewMode: {
        default: "expanded",
        parseHTML: (element) =>
          element.getAttribute("data-view-mode") || "expanded",
        renderHTML: (attributes) => ({
          "data-view-mode": attributes.viewMode,
        }),
      },
      uploading: {
        default: false,
        renderHTML: (attributes) => {
          if (!attributes.uploading) return {};
          return { "data-uploading": "true" };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]:not([src^="data:"])',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes)];
  },

  addCommands() {
    return {
      setDreamImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
