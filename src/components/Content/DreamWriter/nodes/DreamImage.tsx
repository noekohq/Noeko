import { Node, NodeViewProps, Editor as IEditor } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { useCallback, useRef } from "react";
import styles from "./styles/DreamImage.module.scss";
import { Group, Stack, Tooltip, Loader, Box } from "@mantine/core";
import {
  Trash as TrashIcon,
  Cards,
  Rows,
  CornersOut,
  DownloadSimple,
  ArrowSquareOut,
  ResizeIcon,
  ImagesIcon,
} from "@phosphor-icons/react";
import { DreamImageSchema } from "../../../../../shared/editing/tiptap/nodes/DreamImage";
import PaperIcon from "../../../Display/Paper/PaperIcon";
import bubbleStyles from "../BubbleMenu.module.scss";
import { useEditorState } from "@tiptap/react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dreamImage: {
      setDreamImage: (options: {
        src: string;
        alt?: string;
        title?: string;
        width?: string | number;
        height?: string | number;
        fileId?: string;
        viewMode?: "inline" | "minimal" | "expanded";
        uploading?: boolean;
      }) => ReturnType;
    };
  }
}

export const DreamImage = DreamImageSchema.extend({
  addOptions() {
    return {
      HTMLAttributes: {
        class: styles.dreamImageWrapper,
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(DreamImageComponent);
  },
});

export const DreamImageComponent: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  selected,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const resizeLabelRef = useRef<HTMLDivElement>(null);
  const { viewMode = "expanded", uploading } = node.attrs;

  const handleResize = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const updateFunc = updateAttributes;

      if (!imgRef.current) {
        return;
      }
      const startX = event.clientX;
      const startWidth = imgRef.current.offsetWidth;
      const parentWidth = imgRef.current.parentElement?.offsetWidth || document.body.offsetWidth;

      const handleMouseMove = (e: MouseEvent) => {
        const currentX = e.clientX;
        const newWidth = startWidth + (currentX - startX);

        const percentage = (newWidth / parentWidth) * 100;
        const snapPoints = [25, 30, 33.33, 50, 66.66, 75, 100];
        const threshold = 3;

        let finalWidth = `${newWidth}px`;

        for (const point of snapPoints) {
          if (Math.abs(percentage - point) < threshold) {
            finalWidth = `${point}%`;
            break;
          }
        }

        if (imgRef.current) {
          imgRef.current.style.width = finalWidth;
          imgRef.current.style.height = "auto";
        }

        if (resizeLabelRef.current) {
          resizeLabelRef.current.innerText = finalWidth;
          resizeLabelRef.current.style.display = "block";
        }
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        if (imgRef.current) {
          updateFunc({ width: imgRef.current.style.width });
        }
        if (resizeLabelRef.current) {
          resizeLabelRef.current.style.display = "none";
        }
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [updateAttributes]
  );

  return (
    <NodeViewWrapper
      className={styles.dreamImageWrapper}
      data-selected={selected}
      data-view-mode={viewMode}
    >
      <img
        src={node.attrs.src}
        alt={node.attrs.alt}
        title={node.attrs.title}
        data-file-id={node.attrs.fileId}
        style={{
          width: node.attrs.width,
          height: node.attrs.height,
        }}
        ref={imgRef}
        className={styles.dreamImage}
        draggable="true"
        data-drag-handle
      />

      <div ref={resizeLabelRef} className={styles.resizeLabel} style={{ display: "none" }}></div>

      {uploading && (
        <Box
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.3)",
            borderRadius: "var(--mantine-radius-sm)",
          }}
        >
          <Loader color="white" size="sm" />
        </Box>
      )}

      {selected && !uploading && (
        <div
          className={`${styles.resizeHandle}`}
          onMouseDown={(e) => {
            e.stopPropagation();
            handleResize(e);
          }}
          title="Resize"
          style={{ pointerEvents: "auto" }}
        />
      )}
    </NodeViewWrapper>
  );
};

interface IDreamImageMenuProps {
  editor: IEditor;
}

export const DreamImageMenu = ({ editor }: IDreamImageMenuProps) => {
  // Use useEditorState to force re-render when selection updates
  useEditorState({
    editor,
    selector: (ctx) => {
      return {
        viewMode: ctx.editor.getAttributes("dreamImage").viewMode,
        src: ctx.editor.getAttributes("dreamImage").src,
      };
    },
  });

  const deleteSelectedNode = () => {
    editor.chain().focus().deleteNode("dreamImage").run();
  };

  const restoreSizeToDefault = () => {
    editor
      .chain()
      .focus()
      .updateAttributes("dreamImage", {
        width: "100%",
        height: "auto",
        viewMode: "expanded",
      })
      .run();
  };

  const setViewMode = (mode: "inline" | "minimal" | "expanded") => {
    const attrs: any = { viewMode: mode };

    // Reset or set default widths based on mode
    if (mode === "expanded") {
      attrs.width = "100%";
    } else if (mode === "inline") {
      // Default to 50% for inline mode to allow side-by-side
      attrs.width = "50%";
    }

    editor.chain().focus().updateAttributes("dreamImage", attrs).run();
  };

  const wrapInGallery = () => {
    // If the selection is a NodeSelection of a dreamImage, wrap it in a gallery.
    // If it's a multiple node selection (unlikely with just one image focused), we might want to wrap all.
    // Tiptap's wrapIn command works on the current selection.
    // However, wrapIn expects a block content. dreamGallery expects dreamImage+.
    // Since dreamImage is a block, this should work.
    editor.chain().focus().setDreamGallery().run();
  };

  const currentMode = editor.getAttributes("dreamImage").viewMode || "expanded";
  const currentSrc = editor.getAttributes("dreamImage").src;

  return (
    <Group gap={0}>
      <div className={bubbleStyles.buttonGroup}>
        <Tooltip label="Inline View (Left)">
          {/* Wrap in div to avoid PaperIcon ref issues if any */}
          <div>
            <PaperIcon
              aria-label="Select inline view mode"
              onClick={() => setViewMode("inline")}
              className={currentMode === "inline" ? styles.filledIcon : ""}
            >
              <Cards weight="bold" />
            </PaperIcon>
          </div>
        </Tooltip>
        <Tooltip label="Minimal View (Centered)">
          <div>
            <PaperIcon
              onClick={() => setViewMode("minimal")}
              aria-label="Minimal View (Just Image)"
              className={currentMode === "minimal" ? styles.filledIcon : ""}
            >
              <Rows weight="bold" />
            </PaperIcon>
          </div>
        </Tooltip>
        <Tooltip label="Expanded View (Full)">
          <div>
            <PaperIcon
              onClick={() => setViewMode("expanded")}
              aria-label="Expanded View (Full)"
              className={currentMode === "expanded" ? styles.filledIcon : ""}
            >
              <CornersOut weight="bold" />
            </PaperIcon>
          </div>
        </Tooltip>
      </div>
      <div className={bubbleStyles.buttonGroup}>
        <Tooltip label="Restore size to default">
          <PaperIcon aria-label="Restore size to default" onClick={restoreSizeToDefault}>
            <ResizeIcon />
          </PaperIcon>
        </Tooltip>
        <Tooltip label="Download image">
          <PaperIcon
            aria-label="Download image"
            onClick={() => {
              const link = document.createElement("a");
              link.href = currentSrc;
              link.download = "image";
              link.target = "_blank";
              link.click();
            }}
          >
            <DownloadSimple />
          </PaperIcon>
        </Tooltip>
        <Tooltip label="Open in new tab">
          <PaperIcon aria-label="Open in new tab" onClick={() => window.open(currentSrc, "_blank")}>
            <ArrowSquareOut />
          </PaperIcon>
        </Tooltip>
      </div>
      <div className={bubbleStyles.buttonGroup}>
        <Tooltip label="Wrap in Gallery">
          <PaperIcon aria-label="Wrap in Gallery" onClick={wrapInGallery}>
            <ImagesIcon />
          </PaperIcon>
        </Tooltip>
      </div>
      <div className={bubbleStyles.buttonGroup}>
        <Tooltip label="Remove this image">
          <PaperIcon
            aria-label="Remove this image"
            onClick={deleteSelectedNode}
            className={styles.redIcon}
          >
            <TrashIcon />
          </PaperIcon>
        </Tooltip>
      </div>
    </Group>
  );
};
