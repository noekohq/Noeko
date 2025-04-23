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
    dreamIdea: {
      setDreamIdea: (options: { id: string; alias: string }) => ReturnType;
    };
  }
}

export const DreamFile = Node.create<DreamFileOptions>({
  name: "dreamIdea",
  group: "inline",
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-idea-id"),
        renderHTML: (attributes) => ({ "data-idea-id": attributes.id }),
      },
      alias: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-idea-alias"),
        renderHTML: (attributes) => ({ "data-idea-alias": attributes.alias }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "a[href][data-idea-id]",
      },
    ];
  },

  addCommands() {
    return {
      setDreamIdea:
        (options) =>
        ({ commands }) => {
          if (!options.id || !options.alias) {
            console.error("Cannot set idea link without id and alias");
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
    return ReactNodeViewRenderer(DreamConnectionComponent);
  },
});

export const DreamConnectionComponent: React.FC<NodeViewProps> = (props) => {
  const { node, deleteNode, editor, selected } = props;
  const { id, alias } = node.attrs;

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
      <Link
        to={`/idea/${id}`}
        rel="noopener noreferrer nofollow"
        className={styles.dreamFileLink}
        title={`Go to ${alias}`}
      >
        {alias || "Untitled Idea"}
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
