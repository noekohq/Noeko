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
import {
  DreamFileSchema,
  IDreamFileOptions,
} from "../../../../../shared/editing/tiptap/nodes/DreamFile";
// Keep Mantine, React Router, hook, types, and helper imports...

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

export const DreamFile = DreamFileSchema.extend<IDreamFileOptions>({
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
        file?.originalFileName ?? fileName ?? "noeko-file", // Use node fileName as fallback
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
