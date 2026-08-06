import { Editor as IEditor, Extension, Node, Mark } from "@tiptap/core";

import StarterKit from "@tiptap/starter-kit";
import Typography from "@tiptap/extension-typography";
import { ListKeymap, TaskList } from "@tiptap/extension-list";
import { DreamMathSchema } from "../../../../shared/editing/tiptap/extensions/DreamMath";
import { DreamIndentSchema } from "../../../../shared/editing/tiptap/extensions/DreamIndent";
import { DreamImageSchema } from "../../../../shared/editing/tiptap/nodes/DreamImage";
import { DreamFileSchema } from "../../../../shared/editing/tiptap/nodes/DreamFile";
import { DreamIdeaSchema } from "../../../../shared/editing/tiptap/nodes/DreamIdea";
import { DreamTaskSchema } from "../../../../shared/editing/tiptap/nodes/DreamTask";
import { DreamSourceSchema } from "../../../../shared/editing/tiptap/nodes/DreamSource";
import { DreamTransclusionSchema } from "../../../../shared/editing/tiptap/nodes/DreamTransclusion";
import { DreamTaskItemSchema } from "../../../../shared/editing/tiptap/nodes/DreamTaskItem";
import { DreamCodeSchema } from "../../../../shared/editing/tiptap/nodes/DreamCode";
import { DreamTableSchema } from "../../../../shared/editing/tiptap/nodes/DreamTable";
import { DreamGallerySchema } from "../../../../shared/editing/tiptap/nodes/DreamGallery";
import { DreamHighlightSchema } from "../../../../shared/editing/tiptap/marks/DreamHighlight";
import { DreamYouTubeSchema } from "../../../../shared/editing/tiptap/nodes/DreamYouTube";
import { Focus, Placeholder, Dropcursor, Gapcursor } from "@tiptap/extensions";
import { all, createLowlight } from "lowlight";

const lowlight = createLowlight(all);

interface IGetExtensionConfigOptions {
  placeholder?: string;
}

interface IGetExtensionConfigReturn {
  extensions: Array<Extension | Node | Mark>;
  loader: ({ editor }: { editor: IEditor }) => void;
}

export const extensions = [
  // HYBRID: StarterKit (Data + UI) - We disable the UI parts
  StarterKit.configure({
    heading: { levels: [1, 2, 3, 4, 5] },
    codeBlock: false, // We use DreamCode instead
    dropcursor: false, // UI
    gapcursor: false, // UI
  }),

  // DATA: Containers & Structure
  TaskList,
  DreamTableSchema,
  DreamGallerySchema,

  // DATA: Custom Nodes & Marks
  DreamIndentSchema.configure({
    types: [
      "paragraph",
      "heading",
      "blockquote",
      "listItem",
      "codeBlock",
      "dreamTable",
      "dreamGallery",
      "dreamImage",
      "dreamFile",
      "dreamIdea",
      "dreamTask",
      "dreamSource",
      "dreamTransclusion",
    ],
  }),
  DreamMathSchema.configure({}),
  DreamCodeSchema.configure({ lowlight }),
  DreamTaskItemSchema.configure({ nested: true }),

  DreamImageSchema,
  DreamFileSchema,
  DreamIdeaSchema,
  DreamTaskSchema,
  DreamSourceSchema,
  DreamTransclusionSchema,
  DreamHighlightSchema,
  DreamYouTubeSchema,
];
