import { Node, mergeAttributes } from "@tiptap/core";

export type DreamGalleryLayout = "grid" | "masonry" | "filmstrip";

export interface IGalleryImage {
  src: string;
  alt?: string;
  fileId?: string;
  // Add any other attributes your images need (width, height, etc.)
}

export interface IDreamGalleryOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dreamGallery: {
      setDreamGallery: (options?: { images?: IGalleryImage[] }) => ReturnType;
      toggleDreamGalleryLayout: () => ReturnType;
    };
  }
}

export const DreamGallerySchema = Node.create<IDreamGalleryOptions>({
  name: "dreamGallery",
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
      layout: {
        default: "grid",
        parseHTML: (element) =>
          (element.getAttribute("data-layout") as DreamGalleryLayout) || "grid",
        renderHTML: (attributes) => ({
          "data-layout": attributes.layout,
        }),
      },
      images: {
        default: [],
        parseHTML: (element) => {
          const imagesStr = element.getAttribute("data-images");
          if (imagesStr) {
            try {
              return JSON.parse(imagesStr);
            } catch (e) {
              return [];
            }
          }
          return [];
        },
        renderHTML: (attributes) => ({
          "data-images": JSON.stringify(attributes.images),
        }),
      },
      uploading: { default: false },
      error: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="dreamGallery"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "dreamGallery",
      }),
    ];
  },

  addCommands() {
    return {
      setDreamGallery:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              images: options?.images || [],
              layout: "grid",
            },
          });
        },
      toggleDreamGalleryLayout:
        () =>
        ({ commands, editor }) => {
          const currentLayout = editor.getAttributes("dreamGallery").layout;
          const layouts: DreamGalleryLayout[] = ["grid", "masonry", "filmstrip"];
          const nextLayout = layouts[(layouts.indexOf(currentLayout) + 1) % layouts.length];
          return commands.updateAttributes("dreamGallery", { layout: nextLayout });
        },
    };
  },
});
