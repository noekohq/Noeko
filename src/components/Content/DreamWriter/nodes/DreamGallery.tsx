import {
  DreamGallerySchema,
  IGalleryImage,
} from '../../../../../shared/editing/tiptap/nodes/DreamGallery';
import {
  NodeViewWrapper,
  NodeViewProps,
  ReactNodeViewRenderer,
  useEditorState,
} from "@tiptap/react";
import { useCallback, useState, useEffect, useRef } from "react";
import { Group, ActionIcon, Tooltip, FileButton, Text, Menu, Loader, Stack } from "@mantine/core";
import {
  SquaresFourIcon,
  RowsIcon,
  FilmStripIcon,
  PlusIcon,
  UploadSimpleIcon,
  XIcon,
  DownloadSimpleIcon,
  ArrowSquareOutIcon,
  SelectionBackgroundIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import styles from '@core/design/styles/DreamGallery.module.scss';
import { ISubMenuProps } from "../BubbleMenu";
import { getButtonProps } from "../Options";
import { Attrs } from "@tiptap/pm/model";
import { uploadDreamFilesHeadless } from "../lib/utils/fileUploadHeadless";
import PaperIcon from '@core/design/components/Paper/PaperIcon';
import { PaperLightbox, IPaperLightboxItem } from '@core/design/components/Paper/PaperLightbox';

// Types
type IGalleryLayout = "grid" | "masonry" | "filmstrip";

export const DreamGallery = DreamGallerySchema.extend({
  addNodeView() {
    return ReactNodeViewRenderer(DreamGalleryComponent);
  },
});

export function DreamGalleryComponent({
  node,
  updateAttributes,
  selected,
  editor,
  getPos,
}: NodeViewProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [imageMenuPosition, setImageMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { uploading, error } = node.attrs;
  const currentLayout = (node.attrs.layout as IGalleryLayout) || "grid";
  const images = (node.attrs.images as IGalleryImage[]) || [];

  const lightboxItems: IPaperLightboxItem[] = images.map((img, idx) => ({
    id: img.fileId || idx,
    type: "image",
    src: img.src,
    alt: img.alt,
  }));

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;

      updateAttributes({ uploading: true, error: null });

      try {
        // Get connectableId from the dreamFileHandler extension if available
        const fileHandler = editor.extensionManager.extensions.find(
          (e) => e.name === "dreamFileHandler"
        );
        const connectableId = fileHandler?.options?.connectableId;

        // Upload files headlessly and get back the data
        const uploadedFiles = await uploadDreamFilesHeadless(files, {
          allowedTypes: ["image/png", "image/jpeg", "image/gif", "image/webp"],
          connectableId,
        });

        // Convert uploaded files to gallery image format
        const newImages: IGalleryImage[] = uploadedFiles.map((file) => ({
          src: file.src,
          fileId: file.fileId,
          alt: file.fileName,
        }));

        // Update the gallery's images attribute
        updateAttributes({ images: [...images, ...newImages], uploading: false });
      } catch (err) {
        console.error("Failed to upload gallery images:", err);
        updateAttributes({ error: "Failed to upload images", uploading: false });
      } finally {
        setIsDragging(false);
      }
    },
    [images, updateAttributes, editor]
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
    if (error) updateAttributes({ error: null });
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeImage = (indexToRemove: number) => {
    const updatedImages = images.filter((_, index) => index !== indexToRemove);
    updateAttributes({ images: updatedImages });
  };

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  // Close image menu when clicking outside
  useEffect(() => {
    if (selectedImageIndex === null) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`.${styles.imageItem}`) && !target.closest(`.${styles.imageMenu}`)) {
        setSelectedImageIndex(null);
        setImageMenuPosition(null);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [selectedImageIndex]);

  // Handle image selection
  const handleImageClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedImageIndex === index) {
      // Double click or re-click opens lightbox
      openLightbox(index);
      setSelectedImageIndex(null);
      setImageMenuPosition(null);
    } else {
      // Single click selects the image
      setSelectedImageIndex(index);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setImageMenuPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      });
    }
  };

  // Handle keyboard navigation for image selection
  const handleImageKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openLightbox(index);
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      setSelectedImageIndex(index - 1);
      imageRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < images.length - 1) {
      e.preventDefault();
      setSelectedImageIndex(index + 1);
      imageRefs.current[index + 1]?.focus();
    } else if (e.key === "Escape") {
      setSelectedImageIndex(null);
      setImageMenuPosition(null);
    }
  };

  // Split image from gallery
  const splitImageFromGallery = (index: number) => {
    const imageToSplit = images[index];
    if (!imageToSplit) return;

    const nodePos = getPos();
    if (typeof nodePos !== "number") return;

    // Create a new dreamImage node
    const dreamImageAttrs = {
      src: imageToSplit.src,
      alt: imageToSplit.alt || "",
      fileId: imageToSplit.fileId,
      width: "100%",
      viewMode: "expanded",
    };

    // Remove image from gallery
    const updatedImages = images.filter((_, i) => i !== index);

    // If gallery will be empty after split, delete the gallery node entirely
    // Otherwise, update the gallery with the remaining images
    if (updatedImages.length === 0) {
      // Delete the gallery and insert the image in its place
      editor
        .chain()
        .focus()
        .deleteRange({ from: nodePos, to: nodePos + node.nodeSize })
        .insertContentAt(nodePos, {
          type: "dreamImage",
          attrs: dreamImageAttrs,
        })
        .run();
    } else {
      // Update gallery and insert the image after it
      editor
        .chain()
        .focus()
        .updateAttributes("dreamGallery", { images: updatedImages })
        .insertContentAt(nodePos + node.nodeSize, {
          type: "dreamImage",
          attrs: dreamImageAttrs,
        })
        .run();
    }

    setSelectedImageIndex(null);
    setImageMenuPosition(null);
  };

  // Remove image from gallery
  const handleRemoveImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    updateAttributes({ images: updatedImages });
    setSelectedImageIndex(null);
    setImageMenuPosition(null);
  };

  // Download image
  const handleDownloadImage = (image: IGalleryImage) => {
    const link = document.createElement("a");
    link.href = image.src;
    link.download = image.alt || "image";
    link.target = "_blank";
    link.click();
  };

  // Open image in new tab
  const handleOpenInNewTab = (image: IGalleryImage) => {
    window.open(image.src, "_blank");
  };

  return (
    <NodeViewWrapper
      className={`${styles.galleryWrapper} ${selected ? styles.selected : ""}`}
      data-layout={currentLayout}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Drop Zone */}
      {isDragging && (
        <div className={styles.dropZone}>
          <UploadSimpleIcon size={48} />
          <Text c="dimmed" size="sm">
            Drop images to add to gallery
          </Text>
        </div>
      )}

      {/* Uploading Overlay */}
      {uploading && !error && (
        <div className={styles.statusOverlay}>
          <Stack align="center" gap="xs">
            <Loader size="md" color="blue" />
            <Text size="sm" c="dark" fw={500}>
              Uploading images...
            </Text>
          </Stack>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className={`${styles.statusOverlay} ${styles.errorOverlay}`}>
          <Stack align="center" gap="xs">
            <XIcon size={32} weight="bold" color="var(--mantine-color-red-1)" />
            <Text size="sm" c="dark.1" fw={600}>
              {error}
            </Text>
            <Text
              size="xs"
              c="dark.1"
              style={{ cursor: "pointer", textDecoration: "underline" }}
              onClick={() => updateAttributes({ error: null })}
            >
              Dismiss
            </Text>
          </Stack>
        </div>
      )}

      {/* Empty State */}
      {images.length === 0 && !isDragging && (
        <div className={styles.emptyState}>
          <Text c="dimmed" size="sm">
            Gallery is empty. Drop images here.
          </Text>
        </div>
      )}

      {/* React-Rendered Image Content */}
      <div className={styles.content}>
        {images.map((img, index) => (
          <div
            key={index}
            ref={(el) => {
              imageRefs.current[index] = el;
            }}
            className={`${styles.imageItem} ${selectedImageIndex === index ? styles.imageSelected : ""}`}
            tabIndex={0}
            onClick={(e) => handleImageClick(index, e)}
            onKeyDown={(e) => handleImageKeyDown(index, e)}
            data-image-index={index}
          >
            {selected && (
              <ActionIcon
                className={styles.removeButton}
                size="sm"
                variant="filled"
                color="red"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(index);
                }}
                title="Remove image"
              >
                <XIcon size={12} />
              </ActionIcon>
            )}
            <img
              src={img.src}
              alt={img.alt || `Gallery Image ${index + 1}`}
              className={styles.clickableImage}
            />
          </div>
        ))}
      </div>

      {/* Floating Image Menu */}
      {selectedImageIndex !== null && imageMenuPosition && (
        <div
          className={styles.imageMenu}
          style={{
            position: "fixed",
            left: imageMenuPosition.x,
            top: imageMenuPosition.y,
            transform: "translate(-50%, -100%)",
            zIndex: 1000,
          }}
        >
          <Group gap="xs" className={styles.imageMenuContent}>
            <Tooltip label="Split from gallery" withArrow>
              <PaperIcon
                aria-label="Split this image from gallery"
                onClick={() => splitImageFromGallery(selectedImageIndex)}
              >
                <SelectionBackgroundIcon />
              </PaperIcon>
            </Tooltip>
            <Tooltip label="Download" withArrow>
              <PaperIcon
                aria-label="Download this image"
                onClick={() => handleDownloadImage(images[selectedImageIndex])}
              >
                <DownloadSimpleIcon />
              </PaperIcon>
            </Tooltip>
            <Tooltip label="Open in new tab" withArrow>
              <PaperIcon
                aria-label="Open in a new tab"
                onClick={() => handleOpenInNewTab(images[selectedImageIndex])}
              >
                <ArrowSquareOutIcon />
              </PaperIcon>
            </Tooltip>
            <Tooltip label="Remove from gallery" withArrow>
              <PaperIcon
                aria-label="Remove this image"
                onClick={() => handleRemoveImage(selectedImageIndex)}
                className={styles.redIcon}
              >
                <TrashIcon />
              </PaperIcon>
            </Tooltip>
          </Group>
        </div>
      )}

      {/* Lightbox */}
      <PaperLightbox
        opened={lightboxOpen}
        onClose={closeLightbox}
        items={lightboxItems}
        currentIndex={currentImageIndex}
        onIndexChange={setCurrentImageIndex}
        renderActions={(_item, index) => (
          <Group gap="sm">
            <Tooltip label="Split from gallery" withArrow>
              <button
                {...getButtonProps({ isActive: false })}
                onClick={() => {
                  splitImageFromGallery(index);
                  closeLightbox();
                }}
              >
                <SelectionBackgroundIcon size={20} />
              </button>
            </Tooltip>
            <Tooltip label="Download" withArrow>
              <button
                {...getButtonProps({ isActive: false })}
                onClick={() => {
                  if (images[index]) {
                    handleDownloadImage(images[index]);
                  }
                }}
              >
                <DownloadSimpleIcon size={20} />
              </button>
            </Tooltip>
            <Tooltip label="Open in new tab" withArrow>
              <button
                {...getButtonProps({ isActive: false })}
                onClick={() => {
                  if (images[index]) {
                    handleOpenInNewTab(images[index]);
                  }
                }}
              >
                <ArrowSquareOutIcon size={20} />
              </button>
            </Tooltip>
            <Tooltip label="Remove from gallery" withArrow>
              <button
                {...getButtonProps({ isActive: false })}
                onClick={() => {
                  handleRemoveImage(index);
                  if (images.length <= 1) {
                    closeLightbox();
                  } else if (index >= images.length - 1) {
                    setCurrentImageIndex(Math.max(0, images.length - 2));
                  }
                }}
              >
                <TrashIcon size={20} />
              </button>
            </Tooltip>
          </Group>
        )}
      />
    </NodeViewWrapper>
  );
}

export function DreamGalleryMenu({ editor, classes: { group: buttonGroup } }: ISubMenuProps) {
  const { layout, images, uploading, nodeExists } = useEditorState({
    editor,
    selector: (ctx) => {
      const attrs = ctx.editor.getAttributes("dreamGallery");
      return {
        layout: (attrs.layout as IGalleryLayout) || "grid",
        images: (attrs.images as IGalleryImage[]) || [],
        uploading: !!attrs.uploading,
        nodeExists: !!ctx.editor.state.selection,
      };
    },
  });

  const handleChangeLayout = (newLayout: IGalleryLayout) => {
    editor.chain().focus().updateAttributes("dreamGallery", { layout: newLayout }).run();
  };

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (!files.length || !nodeExists) return;

      editor
        .chain()
        .focus()
        .updateAttributes("dreamGallery", { uploading: true, error: null })
        .run();

      try {
        const fileHandler = editor.extensionManager.extensions.find(
          (e) => e.name === "dreamFileHandler"
        );
        const connectableId = fileHandler?.options?.connectableId;

        const uploadedFiles = await uploadDreamFilesHeadless(files, {
          allowedTypes: ["image/png", "image/jpeg", "image/gif", "image/webp"],
          connectableId,
        });

        const newImages: IGalleryImage[] = uploadedFiles.map((file) => ({
          src: file.src,
          fileId: file.fileId,
          alt: file.fileName,
        }));

        editor
          .chain()
          .focus()
          .updateAttributes("dreamGallery", {
            images: [...images, ...newImages],
            uploading: false,
          })
          .run();
      } catch (err) {
        console.error("Failed to upload gallery images from menu:", err);
        editor
          .chain()
          .focus()
          .updateAttributes("dreamGallery", { uploading: false, error: "Failed to upload images" })
          .run();
      }
    },
    [editor, images, nodeExists]
  );

  return (
    <Group gap="xs">
      <div className={buttonGroup}>
        <Tooltip label="Grid Layout" withArrow>
          <button
            {...getButtonProps({ isActive: layout === "grid" })}
            onClick={() => handleChangeLayout("grid")}
            type="button"
          >
            <SquaresFourIcon size={20} />
          </button>
        </Tooltip>

        <Tooltip label="Masonry Layout" withArrow>
          <button
            {...getButtonProps({ isActive: layout === "masonry" })}
            onClick={() => handleChangeLayout("masonry")}
            type="button"
          >
            <RowsIcon size={20} />
          </button>
        </Tooltip>

        <Tooltip label="Filmstrip Layout" withArrow>
          <button
            {...getButtonProps({ isActive: layout === "filmstrip" })}
            onClick={() => handleChangeLayout("filmstrip")}
            type="button"
          >
            <FilmStripIcon size={20} />
          </button>
        </Tooltip>
      </div>
      <div className={buttonGroup}>
        <FileButton
          onChange={handleFiles}
          accept="image/png,image/jpeg,image/gif,image/webp"
          multiple
        >
          {(props) => (
            <Tooltip label="Add Images" withArrow>
              <button
                {...props}
                {...getButtonProps({ isActive: false })}
                type="button"
                disabled={uploading}
              >
                {uploading ? (
                  <Loader size={20} color="blue" />
                ) : (
                  <PlusIcon size={20} weight="bold" />
                )}
              </button>
            </Tooltip>
          )}
        </FileButton>
      </div>
    </Group>
  );
}
