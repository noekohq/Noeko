import { mergeAttributes, Node } from "@tiptap/core";

export type DreamTransclusionType = "idea" | "task" | "source";
export type DreamTransclusionViewMode = "minimal" | "expanded";

export interface IDreamTransclusionOptions {
  HTMLAttributes: Record<string, unknown>;
}

export const DreamTransclusionSchema = Node.create<IDreamTransclusionOptions>({
  name: "dreamTransclusion",
  group: "block",
  atom: true,
  draggable: true,
  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      connectableType: {
        default: "idea" as DreamTransclusionType,
        parseHTML: (element) => element.getAttribute("data-connectable-type") || "idea",
        renderHTML: (attributes) => ({
          "data-connectable-type": attributes.connectableType,
        }),
      },
      connectableId: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-connectable-id"),
        renderHTML: (attributes) => ({
          "data-connectable-id": attributes.connectableId,
        }),
      },
      label: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-label") || "",
        renderHTML: (attributes) => ({
          "data-label": attributes.label,
        }),
      },
      viewMode: {
        default: "minimal" as DreamTransclusionViewMode,
        parseHTML: (element) => element.getAttribute("data-view-mode") || "minimal",
        renderHTML: (attributes) => ({
          "data-view-mode": attributes.viewMode,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-dream-transclusion][data-connectable-type][data-connectable-id]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-dream-transclusion": "",
      }),
    ];
  },

  addCommands() {
    return {
      setDreamTransclusion:
        (options) =>
        ({ commands }) => {
          if (!options.connectableId || !options.connectableType) {
            return false;
          }

          return commands.insertContent({
            type: this.name,
            attrs: {
              connectableType: options.connectableType,
              connectableId: options.connectableId,
              label: options.label || "",
              viewMode: options.viewMode || "minimal",
            },
          });
        },
    };
  },
});
