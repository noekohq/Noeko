import contentStyles from "./Content.module.scss";
import styles from "./DreamWriter.module.scss";
import "katex/dist/katex.min.css";
import "./lib/noeko-highlight.scss";
import { Editor as IEditor, Extension, Node, Mark } from "@tiptap/core";

import StarterKit from "@tiptap/starter-kit";
import Typography from "@tiptap/extension-typography";
import { DreamMathSchema } from "../../../../shared/editing/tiptap/extensions/DreamMath";
import { ListKeymap, TaskList } from "@tiptap/extension-list";
import { DreamImage } from "./nodes/DreamImage";
import { DreamFile } from "./nodes/DreamFile";
import { DreamFileHandler } from "./extensions/DreamFileHandler";
import { DreamConnection } from "./extensions/DreamConnection";
import { DreamIdea } from "./nodes/DreamIdea";
import { DreamTask } from "./nodes/DreamTask";
import { DreamSource } from "./nodes/DreamSource";
import { DreamSlash } from "./extensions/DreamSlash";
import { DreamInputs } from "./extensions/DreamInputs";
import { Indent } from "./extensions/Indent";
import { DreamTaskItem } from "./extensions/TaskItem";
import { DreamCode } from "./nodes/DreamCode";
import { DreamPaste } from "./extensions/DreamPaste";
import { DreamTable } from "./nodes/DreamTable";
import { DreamGallery } from "./nodes/DreamGallery";
import { DreamHighlight } from "./marks/DreamHighlight";
import { all, createLowlight } from "lowlight";
import { DreamYouTube } from "./nodes/DreamYouTube";
import { Focus, Placeholder, Dropcursor, Gapcursor } from "@tiptap/extensions";

const lowlight = createLowlight(all);

interface IGetExtensionConfigOptions {
  editable: boolean;
  placeholder?: string;
  connectableId?: string;
}

interface IGetExtensionConfigReturn {
  extensions: Array<Extension | Node | Mark>;
  loader: ({ editor }: { editor: IEditor }) => void;
}

// THIS MUST BE SYNCHRONIZED WITH THE BACKEND VERSION
// (TODO: consolidate the two extension configurations into a single source of truth)
export const getExtensionConfig = ({
  editable,
  placeholder,
  connectableId,
}: IGetExtensionConfigOptions): IGetExtensionConfigReturn => ({
  extensions: [
    // 1. CORE HYBRID (Synced with Server)
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3, 4, 5],
        HTMLAttributes: { class: contentStyles.heading },
      },
      horizontalRule: {
        HTMLAttributes: { class: contentStyles.horizontalRule },
      },
      blockquote: { HTMLAttributes: { class: contentStyles.blockquote } },
      paragraph: { HTMLAttributes: { class: contentStyles.paragraph } },
      listItem: { HTMLAttributes: { class: contentStyles.listItem } },
      orderedList: { HTMLAttributes: { class: contentStyles.orderedList } },
      bulletList: { HTMLAttributes: { class: contentStyles.bulletList } },
      strike: { HTMLAttributes: { class: contentStyles.strike } },
      underline: { HTMLAttributes: { class: contentStyles.underline } },
      link: {
        HTMLAttributes: { class: contentStyles.link },
        linkOnPaste: true,
      },
      code: {
        HTMLAttributes: { class: contentStyles.code },
      },
      codeBlock: false,
      dropcursor: false,
      gapcursor: false,
    }),

    // 2. UI EXTENSIONS (Client Only)
    ListKeymap.configure(),
    Placeholder.configure({
      placeholder,
      emptyEditorClass: styles.emptyEditor,
      emptyNodeClass: styles.emptyNode,
    }),
    Dropcursor.configure({}),
    Gapcursor.configure({}),
    Focus.configure({}),
    Typography.configure({}),

    // 3. DATA EXTENSIONS (Synced with Server)
    TaskList.configure({
      HTMLAttributes: { class: contentStyles.taskList },
    }),

    Indent.configure({
      // MUST MATCH SERVER NODE NAMES EXACTLY
      types: [
        "paragraph",
        "heading",
        "blockquote",
        "listItem", // Server uses "listItem"
        "codeBlock", // DreamCode name is "codeBlock"
        "dreamTable", // DreamTable name is "dreamTable"
        "dreamGallery",
        "dreamImage",
        "dreamFile",
        "dreamIdea",
        "dreamSource",
        "dreamTask", // If using DreamTask
      ],
    }),

    DreamMathSchema.configure({}), // Shared

    DreamCode.configure({
      lowlight,
      HTMLAttributes: { class: contentStyles.codeBlock },
    }),

    DreamTaskItem.configure({
      nested: true,
      HTMLAttributes: { class: contentStyles.taskItem },
    }),

    DreamTable.configure({
      HTMLAttributes: { class: contentStyles.table },
    }),

    DreamGallery.configure({
      HTMLAttributes: { class: contentStyles.gallery },
    }),

    DreamImage.configure({
      HTMLAttributes: { class: contentStyles.image },
    }),


    DreamGallery.configure({
      HTMLAttributes: { class: contentStyles.gallery },
    }),

    DreamImage.configure({
      HTMLAttributes: { class: contentStyles.image },
    }),

    DreamFile.configure({
      HTMLAttributes: { class: contentStyles.file },
    }),

    DreamIdea.configure({
      HTMLAttributes: { class: contentStyles.idea },
      editable,
    }),
    DreamTask.configure({
      HTMLAttributes: { class: contentStyles.task },
      editable,
    }),
    DreamSource.configure({
      HTMLAttributes: { class: contentStyles.source },
      editable,
    }),

    DreamYouTube.configure({
      HTMLAttributes: { class: styles.dreamYouTube },
    }),

    DreamHighlight.configure(),

    ...(connectableId
      ? [
          DreamFileHandler.configure({
            connectableId,
          }),
        ]
      : []),
    DreamConnection.configure({}),
    DreamSlash.configure({}),
    DreamPaste.configure(),
    DreamInputs.configure(),
  ],
  loader: ({ editor }) => {},
});
