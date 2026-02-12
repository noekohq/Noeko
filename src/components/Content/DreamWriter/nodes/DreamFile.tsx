import {
  ArrowRight,
  DownloadSimple,
  File,
  FilePdf,
  X,
  Cards,
  Rows,
  CornersOut,
  Trash,
} from "@phosphor-icons/react";
import { Node, mergeAttributes, Editor as IEditor } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewProps,
  NodeViewContent,
  NodeViewWrapper,
} from "@tiptap/react";
import styles from "./styles/DreamFile.module.scss";
import {
  ActionIcon,
  Card,
  Flex,
  Group,
  Text,
  Badge,
  ThemeIcon,
  Stack,
  Tooltip,
  Loader,
} from "@mantine/core";
import { Link } from "react-router";
import useFetch from "../../../../hooks/useFetch";
import { IUserFile } from "../../../../../app/database/models/userfile";
import { triggerDownload } from "../../../../utils/helpers";
import {
  DreamFileSchema,
  IDreamFileOptions,
} from "../../../../../shared/editing/tiptap/nodes/DreamFile";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dreamFile: {
      setDreamFile: (options: {
        fileId: string;
        fileName: string;
        fileType?: string;
        viewMode?: "inline" | "minimal" | "expanded";
        uploading?: boolean;
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
  const { node, deleteNode, editor, selected, updateAttributes } = props;
  const { fileId, fileName, fileType, viewMode = "expanded", uploading } = node.attrs;

  const icon = uploading ? (
    <Loader size={16} color="gray" />
  ) : fileType?.toLowerCase().includes("pdf") ? (
    <FilePdf weight="bold" />
  ) : (
    <File weight="bold" />
  );

  const { data: file } = useFetch<undefined, IUserFile>({
    url: `/files/${fileId}`,
    runOnMount: !!fileId && !uploading,
  });

  const { load: downloadFile, loading: downloadingFile } = useFetch<undefined, string>({
    url: `/files/${fileId}/download`,
    onSuccess: (downloadLink) => {
      console.info("Triggering download");
      triggerDownload(downloadLink, file?.originalFileName ?? fileName ?? "noeko-file", true);
    },
  });

  const handleDelete = (event: React.MouseEvent) => {
    event.preventDefault();
    deleteNode();
  };

  // Skip error check if uploading (fileId might be temp)
  if (!fileId && !uploading) {
    return <div>Error: Missing File ID</div>;
  }

  const displayName = file?.originalFileName || fileName || "Untitled File";

  // --- Renderers for different modes ---

  if (viewMode === "inline") {
    return (
      <NodeViewWrapper
        className={styles.dreamFile}
        data-file-link-node
        data-selected={selected || undefined}
        data-view-mode="inline"
      >
        <Badge
          size="lg"
          variant="filled"
          radius="sm"
          leftSection={icon}
          rightSection={
            selected && editor.isEditable ? (
              <ActionIcon
                size="xs"
                color="red"
                radius="xl"
                variant="transparent"
                onClick={handleDelete}
              >
                <X weight="bold" />
              </ActionIcon>
            ) : undefined
          }
          style={{ cursor: "pointer", textTransform: "none" }}
          color="dark.4"
        >
          <Link
            to={`/file/${fileId}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            {displayName}
          </Link>
        </Badge>
      </NodeViewWrapper>
    );
  }

  if (viewMode === "minimal") {
    return (
      <NodeViewWrapper
        className={styles.dreamFile}
        data-file-link-node
        data-selected={selected || undefined}
        data-view-mode="minimal"
      >
        <Card radius="md" withBorder shadow="sm" p="xs">
          <Group justify="space-between" wrap="nowrap">
            <Link
              to={`/file/${fileId}`}
              rel="noopener noreferrer nofollow"
              className={styles.dreamFileLink}
              title={`Go to ${displayName}`}
              style={{ textDecoration: "none", flex: 1, minWidth: 0 }}
            >
              <Group wrap="nowrap" gap="xs">
                <ThemeIcon variant="light" color="blue">
                  {icon}
                </ThemeIcon>
                <Text size="sm" fw={500} truncate c="dimmed">
                  {displayName}
                </Text>
              </Group>
            </Link>

            <Group gap={4}>
              <ActionIcon
                onClick={(e) => {
                  e.preventDefault();
                  downloadFile();
                }}
                size="sm"
                variant="subtle"
                loading={downloadingFile}
                title="Download"
              >
                <DownloadSimple />
              </ActionIcon>
              {editor.isEditable && (
                <ActionIcon
                  onClick={handleDelete}
                  size="sm"
                  color="red"
                  variant="subtle"
                  title="Remove"
                >
                  <X />
                </ActionIcon>
              )}
            </Group>
          </Group>
        </Card>
      </NodeViewWrapper>
    );
  }

  // Expanded (Default)
  return (
    <NodeViewWrapper
      className={styles.dreamFile}
      data-file-link-node
      data-selected={selected || undefined}
      data-view-mode="expanded"
    >
      <Card radius="md" withBorder shadow="xs" p="md">
        <Flex direction="column" justify="flex-start" gap="md" style={{ width: "100%" }}>
          <Link
            to={`/file/${fileId}`}
            rel="noopener noreferrer nofollow"
            className={styles.dreamFileLink}
            title={`Go to ${displayName}`}
            style={{ textDecoration: "none" }}
          >
            <Group align="center" wrap="nowrap">
              <Flex c="white" align="center" style={{ flexShrink: 0 }}>
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

interface IDreamFileMenuProps {
  editor: IEditor;
}

export const DreamFileMenu = ({ editor }: IDreamFileMenuProps) => {
  const setViewMode = (mode: "inline" | "minimal" | "expanded") => {
    editor.chain().focus().updateAttributes("dreamFile", { viewMode: mode }).run();
  };

  const deleteSelectedNode = () => {
    editor.chain().focus().deleteNode("dreamFile").run();
  };

  const currentMode = editor.getAttributes("dreamFile").viewMode || "expanded";

  return (
    <Stack>
      <Group gap="xs">
        <Tooltip label="Inline View">
          <ActionIcon
            variant={currentMode === "inline" ? "filled" : "light"}
            onClick={() => setViewMode("inline")}
            title="Inline View"
            radius="sm"
          >
            <Cards weight="bold" />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Minimal View">
          <ActionIcon
            variant={currentMode === "minimal" ? "filled" : "light"}
            onClick={() => setViewMode("minimal")}
            title="Minimal View"
            radius="sm"
          >
            <Rows weight="bold" />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Expanded View">
          <ActionIcon
            variant={currentMode === "expanded" ? "filled" : "light"}
            onClick={() => setViewMode("expanded")}
            title="Expanded View"
            radius="sm"
          >
            <CornersOut weight="bold" />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Remove File">
          <ActionIcon
            variant="light"
            color="red"
            onClick={deleteSelectedNode}
            title="Remove File"
            radius="sm"
          >
            <Trash weight="bold" />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Stack>
  );
};
