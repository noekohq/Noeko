import contentStyles from "./Content.module.scss";
import styles from "./DreamWriter.module.scss";
import "katex/dist/katex.min.css";
import "./lib/noeko-highlight.scss";
import { Editor as IEditor, Extension, Node, Mark } from "@tiptap/core";

import StarterKit from "@tiptap/starter-kit";
import Typography from "@tiptap/extension-typography";
import { ListKeymap, TaskList } from "@tiptap/extension-list";
import { Mathematics } from "@tiptap/extension-mathematics";
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
import { DreamHighlight } from "./marks/DreamHighlight";
import { all, createLowlight } from "lowlight";
import { DreamYouTube } from "./nodes/DreamYouTube";
import { YOUTUBE_URL_REGEX } from "../../../vars/regex";
import { Focus, Placeholder, Dropcursor, Gapcursor } from "@tiptap/extensions";

const lowlight = createLowlight(all);

interface IGetExtensionConfigOptions {
  placeholder?: string;
}

interface IGetExtensionConfigReturn {
  extensions: Array<Extension | Node | Mark>;
  loader: ({ editor }: { editor: IEditor }) => void;
}

export const getExtensionConfig = ({
  placeholder,
}: IGetExtensionConfigOptions): IGetExtensionConfigReturn => ({
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3, 4, 5],
        HTMLAttributes: {
          class: contentStyles.heading,
        },
      },
      horizontalRule: {
        HTMLAttributes: {
          class: contentStyles.horizontalRule,
        },
      },
      blockquote: {
        HTMLAttributes: {
          class: contentStyles.blockquote,
        },
      },
      paragraph: {
        HTMLAttributes: {
          class: contentStyles.paragraph,
        },
      },
      listItem: {
        HTMLAttributes: {
          class: contentStyles.listItem,
        },
      },
      orderedList: {
        HTMLAttributes: {
          class: contentStyles.orderedList,
        },
      },
      bulletList: {
        HTMLAttributes: {
          class: contentStyles.bulletList,
        },
      },
      code: {
        HTMLAttributes: {
          class: contentStyles.code,
        },
      },
      strike: {
        HTMLAttributes: {
          class: contentStyles.strike,
        },
      },
      underline: {
        HTMLAttributes: {
          class: contentStyles.underline,
        },
      },
      link: {
        HTMLAttributes: {
          class: contentStyles.link,
        },
        linkOnPaste: true,
      },
      dropcursor: false,
      gapcursor: false,
    }),
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
    TaskList.configure({
      HTMLAttributes: {
        class: contentStyles.taskList,
      },
    }),
    Indent.configure({
      types: [
        "paragraph",
        "heading",
        "blockquote",
        "list",
        "code",
        "table",
        "image",
        "file",
        "idea",
        "connection",
      ],
    }),
    Mathematics.configure({}),
    DreamCode.configure({
      lowlight,
      HTMLAttributes: {
        class: contentStyles.codeBlock,
      },
    }),
    DreamTaskItem.configure({
      nested: true,
      HTMLAttributes: {
        class: contentStyles.taskItem,
      },
    }),
    DreamTable.configure({
      HTMLAttributes: {
        class: contentStyles.table,
      },
    }),
    DreamImage.configure({
      HTMLAttributes: {
        class: contentStyles.image,
      },
    }),
    DreamFile.configure({
      HTMLAttributes: {
        class: contentStyles.file,
      },
    }),
    DreamIdea.configure({
      HTMLAttributes: {
        class: contentStyles.idea,
      },
    }),
    DreamTask.configure({
      HTMLAttributes: {
        class: contentStyles.task,
      },
    }),
    DreamSource.configure({
      HTMLAttributes: {
        class: contentStyles.source,
      },
    }),
    DreamFileHandler.configure({}),
    DreamConnection.configure({}),
    DreamSlash.configure({}),
    DreamPaste.configure(),
    DreamHighlight.configure(),
    DreamInputs.configure(),
    DreamYouTube.configure({
      HTMLAttributes: {
        class: styles.dreamYouTube,
      },
    }),
  ],
  loader: ({ editor }) => {},
});
