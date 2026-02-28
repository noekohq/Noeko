import React, { useEffect, useRef } from "react";
import {
  DownloadSimpleIcon,
  FileIcon,
  FilePdfIcon,
  XIcon,
  CardsIcon,
  RowsIcon,
  CornersOutIcon,
  ArrowSquareOutIcon,
  WarningCircleIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { NodeViewProps, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import {
  ActionIcon,
  Group,
  Text,
  Stack,
  Tooltip,
  Loader,
  RingProgress,
  Button,
} from "@mantine/core";
import { Link } from "react-router";
import styles from "./styles/DreamFile.module.scss";

import useFetch from "@core/hooks/useFetch";
import { IUserFile } from "../../../../shared/types/userfile";
import { triggerDownload } from "@core/utils/helpers";
import {
  DreamFileSchema,
  IDreamFileOptions,
} from "../../../../shared/editing/tiptap/nodes/DreamFile";
import { ISubMenuProps } from "../BubbleMenu";
import { getButtonProps } from "../Options";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dreamFile: {
      setDreamFile: (options: {
        fileId: string;
        fileName: string;
        fileType?: string;
        viewMode?: "inline" | "minimal" | "expanded";
        uploading?: boolean;
        progress?: number;
        error?: string | null;
      }) => ReturnType;
    };
  }
}

export const DreamFile = DreamFileSchema.extend<IDreamFileOptions>({
  addNodeView() {
    return ReactNodeViewRenderer(DreamFileComponent);
  },
});

/**
 * Helper component for rendering file icon
 * Renamed to FileTypeIcon to avoid collision with Phosphor's FileIcon
 */
const FileTypeIcon = ({
  uploading,
  fileType,
  size = 16,
}: {
  uploading?: boolean;
  fileType?: string | null;
  size?: number;
}) => {
  if (uploading) {
    return <Loader size={size} color="gray" />;
  }
  if (fileType?.toLowerCase().includes("pdf")) {
    return <FilePdfIcon size={size} weight="bold" />;
  }
  return <FileIcon size={size} weight="bold" />;
};

const UploadOverlay = ({
  progress,
  onCancel,
}: {
  progress: number;
  onCancel: (event: React.MouseEvent) => void;
}) => (
  <div className={styles.statusOverlay}>
    <Group align="center" gap="xs">
      <div className={styles.progressContainer}>
        <RingProgress
          size={60}
          thickness={5}
          roundCaps
          sections={[{ value: progress, color: "blue" }]}
          label={
            <Text c="blue" fw={700} ta="center" size="xs">
              {progress}%
            </Text>
          }
        />
      </div>
      <Button
        variant="subtle"
        color="dark"
        size="xs"
        onMouseDownCapture={(e) => e.stopPropagation()}
        onClick={onCancel}
      >
        Cancel
      </Button>
    </Group>
  </div>
);

const ErrorOverlay = ({
  error,
  onRemove,
}: {
  error: string;
  onRemove: (event: React.MouseEvent) => void;
}) => (
  <div className={`${styles.statusOverlay} ${styles.errorOverlay}`}>
    <Group gap="xs" align="center">
      <WarningCircleIcon size={24} weight="fill" color="var(--mantine-color-red-6)" />
      <Text c="white" size="xs" fw={600} ta="center" px="md">
        {error || "Something went wrong."}
      </Text>
      <Button
        variant="light"
        color="red"
        size="xs"
        onMouseDownCapture={(e) => e.stopPropagation()}
        onClick={onRemove}
      >
        Remove
      </Button>
    </Group>
  </div>
);

export const DreamFileComponent: React.FC<NodeViewProps> = (props) => {
  const { node, deleteNode, editor, selected, updateAttributes, getPos } = props;
  const {
    fileId,
    fileName,
    fileType,
    viewMode = "expanded",
    uploading,
    progress = 0,
    error,
  } = node.attrs;

  const zombieTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Consolidated timer logic tracking progress ticks
  useEffect(() => {
    if (zombieTimerRef.current) {
      clearTimeout(zombieTimerRef.current);
    }

    if (uploading && !error) {
      zombieTimerRef.current = setTimeout(() => {
        updateAttributes({
          uploading: false,
          error: "Upload stalled (Timeout)",
        });
      }, 5000);
    }

    return () => {
      if (zombieTimerRef.current) {
        clearTimeout(zombieTimerRef.current);
      }
    };
  }, [uploading, error, progress, updateAttributes]);

  const { data: file } = useFetch<undefined, IUserFile>({
    url: `/files/${fileId}`,
    runOnMount: !!fileId && !uploading && !error,
  });

  const { load: downloadFile, loading: downloadingFile } = useFetch<undefined, string>({
    url: `/files/${fileId}/download`,
    onSuccess: (downloadLink) => {
      triggerDownload(downloadLink, file?.originalFileName ?? fileName ?? "noeko-file", true);
    },
  });

  const handleDelete = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (editor.isEditable) {
      deleteNode();
    }
  };

  if (!fileId && !uploading) {
    return <div>Error: Missing File ID</div>;
  }

  const displayName = file?.originalFileName || fileName || "Untitled File";

  const FileWrapper = ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <NodeViewWrapper
      className={`${styles.dreamFile} ${className || ""} ${uploading || error ? styles.isLoadingOrError : ""}`}
      data-file-link-node
      data-selected={selected || undefined}
      data-view-mode={viewMode}
    >
      {children}
      {uploading && !error && <UploadOverlay progress={progress} onCancel={handleDelete} />}
      {error && <ErrorOverlay error={error} onRemove={handleDelete} />}
    </NodeViewWrapper>
  );

  // --- RENDERING MODES ---

  if (viewMode === "inline") {
    return (
      <FileWrapper className={styles.inlineMode}>
        <div className={styles.iconZone}>
          <FileTypeIcon uploading={uploading} fileType={fileType} size={14} />
        </div>
        <div className={styles.contentWrapper}>
          {uploading ? (
            <Text size="sm">{displayName}</Text>
          ) : error ? (
            <Text size="sm" c="red">
              {displayName}
            </Text>
          ) : (
            <Link
              to={`/file/${fileId}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.dreamFileLink}
              onMouseDownCapture={(e) => e.stopPropagation()}
            >
              {displayName}
            </Link>
          )}
        </div>
        {selected && editor.isEditable && !uploading && !error && (
          <Group gap={4} ml="xs">
            <ActionIcon
              size="xs"
              color="red"
              radius="xl"
              variant="subtle"
              onMouseDownCapture={(e) => e.stopPropagation()}
              onClick={handleDelete}
            >
              <XIcon weight="bold" />
            </ActionIcon>
          </Group>
        )}
      </FileWrapper>
    );
  }

  return (
    <FileWrapper className={styles.blockMode}>
      <div className={styles.iconZone}>
        <FileTypeIcon
          uploading={uploading}
          fileType={fileType}
          size={viewMode === "expanded" ? 24 : 18}
        />
      </div>

      <div className={styles.contentWrapper}>
        <Stack gap={0}>
          {uploading || error ? (
            <Text className={styles.title} truncate="end" c={error ? "red" : "dimmed"}>
              {displayName}
            </Text>
          ) : (
            <Link
              to={`/file/${fileId}`}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className={styles.dreamFileLink}
              title={`Go to ${displayName}`}
              onMouseDownCapture={(e) => e.stopPropagation()}
            >
              <Text className={styles.title} truncate="end">
                {displayName}
              </Text>
            </Link>
          )}
          {viewMode === "expanded" && (
            <Text className={styles.detail} truncate="end">
              {fileType ? fileType.toUpperCase() : "Document"} •{" "}
              {uploading ? "Uploading..." : "Ready"}
            </Text>
          )}
        </Stack>
      </div>

      <div className={styles.actionWrapper}>
        {!uploading && !error && (
          <>
            <button
              className={styles.actionButton}
              onMouseDownCapture={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                downloadFile();
              }}
              title="Download"
              disabled={downloadingFile}
            >
              <DownloadSimpleIcon weight="bold" />
            </button>
            {editor.isEditable && (
              <button
                className={`${styles.actionButton} ${styles.dangerAction}`}
                onMouseDownCapture={(e) => e.stopPropagation()}
                onClick={handleDelete}
                title="Remove"
              >
                <XIcon weight="bold" />
              </button>
            )}
          </>
        )}
      </div>
    </FileWrapper>
  );
};

export const DreamFileMenu = ({ editor, classes: { group: buttonGroup } }: ISubMenuProps) => {
  const setViewMode = (mode: "inline" | "minimal" | "expanded") => {
    editor.chain().focus().updateAttributes("dreamFile", { viewMode: mode }).run();
  };

  const handleRemove = () => editor.chain().focus().deleteSelection().run();

  const handleDownload = () => {
    const attrs = editor.getAttributes("dreamFile");
    if (!attrs.fileId) return;

    fetch(`/api/files/${attrs.fileId}/download`)
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          const link = document.createElement("a");
          link.href = data.data;
          link.download = attrs.fileName || "download";
          link.target = "_blank";
          link.click();
        }
      })
      .catch((err) => console.error("Download failed:", err));
  };

  const currentMode = editor.getAttributes("dreamFile").viewMode || "expanded";

  return (
    <Group gap={0}>
      <div className={buttonGroup}>
        <Tooltip label="Inline View">
          <button
            {...getButtonProps({ isActive: currentMode === "inline" })}
            onClick={() => setViewMode("inline")}
          >
            <CardsIcon weight="bold" />
          </button>
        </Tooltip>
        <Tooltip label="Minimal View">
          <button
            {...getButtonProps({ isActive: currentMode === "minimal" })}
            onClick={() => setViewMode("minimal")}
          >
            <RowsIcon weight="bold" />
          </button>
        </Tooltip>
        <Tooltip label="Expanded View">
          <button
            {...getButtonProps({ isActive: currentMode === "expanded" })}
            onClick={() => setViewMode("expanded")}
          >
            <CornersOutIcon weight="bold" />
          </button>
        </Tooltip>
      </div>

      <div className={buttonGroup}>
        <Tooltip label="Go to file page">
          <button
            {...getButtonProps({ isActive: false })}
            onClick={() => {
              const id = editor.getAttributes("dreamFile").fileId;
              if (id) window.open(`/file/${id}`, "_blank");
            }}
          >
            <ArrowSquareOutIcon />
          </button>
        </Tooltip>
        <Tooltip label="Download">
          <button {...getButtonProps({ isActive: false })} onClick={handleDownload}>
            <DownloadSimpleIcon />
          </button>
        </Tooltip>
      </div>

      <div className={buttonGroup}>
        <Tooltip label="Remove">
          <button {...getButtonProps({ isActive: false })} onClick={handleRemove}>
            <TrashIcon />
          </button>
        </Tooltip>
      </div>
    </Group>
  );
};
