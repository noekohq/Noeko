import {
  ArrowRight,
  DownloadSimple,
  File,
  FilePdf,
  X,
} from "@phosphor-icons/react";
// Keep other imports...
import { Node, mergeAttributes } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewProps,
  NodeViewContent, // Keep import if needed elsewhere, but maybe not used below
  NodeViewWrapper,
} from "@tiptap/react";
import styles from "./styles/DreamFile.module.scss";
import { ActionIcon, Card, Flex, Group, Text } from "@mantine/core";
import { Link } from "react-router";
import useFetch from "../../../../hooks/useFetch";
import { IUserFile } from "../../../../../app/database/models/userfile";
import { triggerDownload } from "../../../../utils/helpers";
// Keep Mantine, React Router, hook, types, and helper imports...

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
  atom: true, // Add this - Marks the node as a single, indivisible unit. Often good for custom nodes that shouldn't have their content directly edited.
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {}, // Keep default HTML attributes option
    };
  },

  addAttributes() {
    return {
      fileId: {
        default: null,
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

  // How to parse this node FROM HTML
  parseHTML() {
    return [
      {
        // Match a <div> tag that has these specific data attributes
        tag: "div[data-dream-file][data-file-id][data-file-name]",
        // data-file-type might be optional, so don't require it in the main selector
        // The individual attribute parsers above will handle grabbing it if present.
      },
    ];
  },

  // How to render this node TO HTML
  renderHTML({ HTMLAttributes }) {
    // Render as a <div> element.
    // HTMLAttributes will contain the rendered attributes from addAttributes (e.g., data-file-id)
    // We also add a specific marker attribute 'data-dream-file' to make parsing more robust.
    // mergeAttributes combines the node's HTMLAttributes option with the specific attributes.
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-dream-file": "", // Add a specific marker
      }),
      // For atom nodes, content is typically 0 (no nested content)
      // If you remove atom:true and need content, place the content hole marker here.
      // 0,
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

  addNodeView() {
    return ReactNodeViewRenderer(DreamFileComponent);
  },
});

export const DreamFileComponent: React.FC<NodeViewProps> = (props) => {
  const { node, deleteNode, editor, selected } = props;
  const { fileId, fileName, fileType } = node.attrs;

  const icon = fileType?.toLowerCase().includes("pdf") ? (
    <FilePdf weight="bold" />
  ) : (
    <File weight="bold" />
  );

  const { data: file } = useFetch<undefined, IUserFile>({
    url: `/files/${fileId}`,
    runOnMount: !!fileId,
  });

  const { load: downloadFile, loading: downloadingFile } = useFetch<
    undefined,
    string
  >({
    url: `/files/${fileId}/download`,
    onSuccess: (downloadLink) => {
      console.info("Triggering download");
      triggerDownload(
        downloadLink,
        file?.originalFileName ?? fileName ?? "qwest-file", // Use node fileName as fallback
        true,
      );
    },
  });

  const handleDelete = (event: React.MouseEvent) => {
    event.preventDefault();
    deleteNode();
  };

  if (!fileId) {
    return <div>Error: Missing File ID</div>;
  }

  const displayName = file?.originalFileName || fileName || "Untitled File";

  return (
    <NodeViewWrapper
      className={styles.dreamFile}
      data-file-link-node
      data-selected={selected || undefined}
    >
      <Card radius="md" withBorder shadow="xs" p="md">
        <Flex
          direction="column"
          justify="flex-start"
          gap="md"
          style={{ width: "100%" }}
        >
          {/* Link to file details page */}
          <Link
            to={`/file/${fileId}`}
            rel="noopener noreferrer nofollow"
            className={styles.dreamFileLink}
            title={`Go to ${displayName}`}
            style={{ textDecoration: "none" }}
          >
            <Group align="center" wrap="nowrap">
              {" "}
              {/* Ensure group doesn't wrap */}
              <Flex c="white" align="center" style={{ flexShrink: 0 }}>
                {" "}
                {icon}
              </Flex>
              <Text c="white" size="lg" truncate>
                {displayName}
              </Text>
            </Group>
          </Link>

          <Group>
            {editor.isEditable && (
              <ActionIcon
                onClick={handleDelete}
                title="Remove file link"
                color="red"
                variant="light"
              >
                <X weight="bold" />
              </ActionIcon>
            )}
            <ActionIcon
              onClick={(e) => {
                e.preventDefault();
                downloadFile();
              }}
              title={`Download ${displayName}`}
              variant="light"
              loading={downloadingFile}
            >
              <DownloadSimple weight="bold" />
            </ActionIcon>
            <Link to={`/file/${fileId}`} title="Go to file page">
              <ActionIcon variant="light">
                <ArrowRight weight="bold" />
              </ActionIcon>
            </Link>
          </Group>
        </Flex>
      </Card>
    </NodeViewWrapper>
  );
};
