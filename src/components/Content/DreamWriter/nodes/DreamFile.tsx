import { File, FilePdf, X } from "@phosphor-icons/react";
import { Node, mergeAttributes } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewProps,
  NodeViewContent,
  NodeViewWrapper,
} from "@tiptap/react";
import styles from "./styles/DreamFile.module.scss";
import { ActionIcon } from "@mantine/core";
import { Link } from "react-router";

export interface DreamFileOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dreamFile: {
      setDreamFile: (options: {
        fileId: string;
        fileName: string;
        fileType?: string;
      }) => ReturnType;
    };
  }
}

export const DreamFile = Node.create<DreamFileOptions>({
  name: "dreamFile",
  group: "block",
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      fileId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-file-id"),
        renderHTML: (attributes) => ({ "data-file-id": attributes.fileId }),
      },
      fileName: {
        default: "Untitled File",
        parseHTML: (element) => element.getAttribute("data-file-name"),
        renderHTML: (attributes) => ({ "data-file-name": attributes.fileName }),
      },
      fileType: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-file-name"),
        renderHTML: (attributes) => ({ "data-file-type": attributes.fileType }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "a[href][data-file-name]",
      },
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
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(DreamFileComponent);
  },
});

export const DreamFileComponent: React.FC<NodeViewProps> = (props) => {
  const { node, deleteNode, editor, selected } = props;
  const { fileId, fileName, fileType } = node.attrs;

  const icon = fileType?.toLowerCase().includes("pdf") ? <FilePdf /> : <File />;

  const handleDelete = (event: React.MouseEvent) => {
    event.preventDefault();
    deleteNode();
  };

  return (
    <NodeViewWrapper
      className={styles.dreamFile}
      data-file-link-node
      data-selected={selected || undefined}
    >
      <span style={{}}>{icon}</span>

      <Link
        to={`/file/${fileId}`}
        rel="noopener noreferrer nofollow"
        className={styles.dreamFileLink}
        title={`Go to ${fileName}`}
      >
        {fileName || "Untitled File"}
        {fileType && `(${fileType})`}
      </Link>

      {editor.isEditable && (
        <ActionIcon onClick={handleDelete} title="Remove file link">
          <X />
        </ActionIcon>
      )}

      <NodeViewContent className={styles.dreamFileContent} />
    </NodeViewWrapper>
  );
};
