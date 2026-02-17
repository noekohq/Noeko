import { Editor, Node, NodeViewProps, setNodeSelection } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, useEditorState } from "@tiptap/react";
import { useCallback, useRef, useEffect, useState, useMemo } from "react";
import { Group, Tooltip, RingProgress, Text, Stack, CloseButton, Button, Box } from "@mantine/core";
import {
  TrashIcon,
  CardsIcon,
  RowsIcon,
  CornersOutIcon,
  DownloadSimpleIcon,
  ArrowSquareOutIcon,
  WarningCircleIcon,
  SlideshowIcon,
  SelectionBackgroundIcon,
  ImagesSquareIcon,
} from "@phosphor-icons/react";

import styles from "./styles/DreamImage.module.scss";
import PaperIcon from "../../../Display/Paper/PaperIcon";
import { DreamImageSchema, IViewMode } from "../../../../../shared/editing/tiptap/nodes/DreamImage";
import { getButtonProps } from "../Options";
import { Attrs, Node as PMNode } from "@tiptap/pm/model";
import { ISubMenuProps } from "../BubbleMenu";

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
  deleteNode,
  getPos,
  editor,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const resizeLabelRef = useRef<HTMLDivElement>(null);
  const zombieTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    viewMode = "expanded" as IViewMode,
    uploading,
    progress = 0,
    error,
    src,
    width,
    height,
  } = node.attrs;

  useEffect(() => {
    if (uploading && !error) {
      zombieTimerRef.current = setTimeout(() => {
        updateAttributes({
          uploading: false,
          error: "Upload interrupted (Session lost)",
        });
      }, 5000);
    }
    return () => {
      if (zombieTimerRef.current) clearTimeout(zombieTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (progress > 0 && zombieTimerRef.current) {
      clearTimeout(zombieTimerRef.current);
      zombieTimerRef.current = null;
    }
  }, [progress]);

  const handleResize = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!imgRef.current) return;

      const startX = event.clientX;
      const startWidth = imgRef.current.offsetWidth;
      const parentWidth = imgRef.current.parentElement?.offsetWidth || document.body.offsetWidth;

      const handleMouseMove = (e: MouseEvent) => {
        const currentX = e.clientX;
        const newWidth = startWidth + (currentX - startX);

        const percentage = (newWidth / parentWidth) * 100;
        const snapPoints = [25, 33.33, 50, 66.66, 75, 100];
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
          updateAttributes({ width: imgRef.current.style.width });
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
      <div className={styles.imageContainer} style={{ position: "relative" }}>
        <img
          src={src}
          alt={node.attrs.alt}
          title={node.attrs.title}
          style={{
            width: width,
            height: height,
            opacity: uploading || error ? 0.4 : 1,
            filter: error ? "grayscale(100%)" : "none",
          }}
          ref={imgRef}
          className={styles.dreamImage}
          draggable="true"
          data-drag-handle
        />

        {/* --- Uploading Overlay --- */}
        {uploading && !error && (
          <div className={styles.statusOverlay}>
            <Stack align="center" gap="xs">
              <div className={styles.progressContainer}>
                <RingProgress
                  size={80}
                  thickness={6}
                  roundCaps
                  sections={[{ value: progress, color: "blue" }]}
                  label={
                    <Text c="blue" fw={700} ta="center" size="xs">
                      {progress}%
                    </Text>
                  }
                />
              </div>
              <Text size="sm" c="dark" fw={500}>
                Uploading...
              </Text>
              <Button variant="light" color="dark" size="sm" onClick={() => deleteNode()}>
                Cancel
              </Button>
            </Stack>
          </div>
        )}

        {/* --- Error Overlay --- */}
        {error && (
          <div className={`${styles.statusOverlay} ${styles.errorOverlay}`}>
            <Stack gap="xs" align="center">
              <WarningCircleIcon size={32} weight="fill" color="var(--mantine-color-red-6)" />
              <Text c="dark.1" size="md" fw={600} ta="center" px="md">
                {error || "Something went wrong."}
              </Text>
              <Button variant="light" color="dark" size="sm" onClick={() => deleteNode()}>
                Remove
              </Button>
            </Stack>
          </div>
        )}

        {/* --- Resize Handles --- */}
        <div ref={resizeLabelRef} className={styles.resizeLabel} style={{ display: "none" }} />

        {selected && !uploading && !error && (
          <div
            className={styles.resizeHandle}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleResize(e);
            }}
            title="Resize"
          />
        )}
      </div>
    </NodeViewWrapper>
  );
};

export const DreamImageMenu = ({ editor, classes: { group: buttonGroup } }: ISubMenuProps) => {
  const { viewMode, src, isGalleryItem } = useEditorState({
    editor,
    selector: (ctx) => {
      const node = ctx.editor.state.selection.$from.node();
      const { selection } = ctx.editor.state;
      const attrs = ctx.editor.getAttributes("dreamImage");

      let insideGallery = false;
      const { $from } = selection;
      if ($from.parent.type.name === "dreamGallery") {
        insideGallery = true;
      }

      return {
        viewMode: attrs.viewMode || "expanded",
        src: attrs.src,
        isGalleryItem: insideGallery,
      };
    },
  });

  const setViewMode = (mode: IViewMode) => {
    const nextAttrs: Attrs & { viewMode: IViewMode; width?: string } = { viewMode: mode };
    if (mode === "expanded") nextAttrs.width = "100%";
    editor.chain().focus().updateAttributes("dreamImage", nextAttrs).run();
  };

  const handleRemove = () => {
    editor.chain().focus().deleteSelection().run();
  };

  const convertToGallery = () => {
    const { selection } = editor.state;
    if (!selection || !("node" in selection)) return;

    const node = selection.node as PMNode;
    const pos = selection.from;

    // Create gallery image from the dreamImage
    const galleryImage = {
      src: node.attrs.src,
      alt: node.attrs.alt,
      fileId: node.attrs.fileId,
    };

    // Delete the dreamImage and insert a gallery with this image
    editor
      .chain()
      .focus()
      .deleteSelection()
      .insertContentAt(pos, {
        type: "dreamGallery",
        attrs: {
          images: [galleryImage],
          layout: "grid",
        },
      })
      .run();
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = src;
    link.download = "image";
    link.target = "_blank";
    link.click();
  };

  return (
    <Group gap={0}>
      <div className={buttonGroup}>
        <Tooltip label="Convert to Gallery">
          <button
            {...getButtonProps({ isActive: false })}
            onClick={() => {
              convertToGallery();
            }}
          >
            <ImagesSquareIcon />
          </button>
        </Tooltip>
      </div>

      <div className={buttonGroup}>
        <Tooltip label="Download">
          <button
            {...getButtonProps({ isActive: false })}
            onClick={() => {
              handleDownload();
            }}
          >
            <DownloadSimpleIcon />
          </button>
        </Tooltip>
        <Tooltip label="Open in new tab">
          <button
            {...getButtonProps({ isActive: false })}
            onClick={() => window.open(src, "_blank")}
          >
            <ArrowSquareOutIcon />
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
