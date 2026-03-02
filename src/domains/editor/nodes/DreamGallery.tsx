import {
  DreamGallerySchema,
  IGalleryImage,
} from "../../../../shared/editing/tiptap/nodes/DreamGallery";
import {
  NodeViewWrapper,
  NodeViewProps,
  ReactNodeViewRenderer,
  useEditorState,
  Editor,
} from "@tiptap/react";
import { useCallback, useState, useMemo, useRef } from "react";
import {
  Group,
  ActionIcon,
  Tooltip,
  FileButton,
  Text,
  Loader,
  Stack,
  Popover,
} from "@mantine/core";
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
  IconProps,
} from "@phosphor-icons/react";
import styles from "./styles/DreamGallery.module.scss";
import { ISubMenuProps } from "../BubbleMenu";
import { getButtonProps } from "../Options";
import { uploadDreamFilesHeadless } from "../lib/utils/fileUpload";
import PaperIcon from "@core/design/components/Paper/PaperIcon";
import { PaperLightbox, IPaperLightboxItem } from "@core/design/components/Paper/PaperLightbox";

// --- Types ---
type IGalleryLayout = "grid" | "masonry" | "filmstrip";

interface IUploadedFile {
  src: string;
  fileId: string;
  fileName: string;
}

interface IImageAction {
  label: string;
  icon: React.FC<IconProps>;
  onClick: () => void;
  isDestructive?: boolean;
}

// --- Extracted Hook for DRY Uploads ---
function useGalleryUpload(
  editor: Editor,
  images: IGalleryImage[],
  updateAttributes: (attrs: Record<string, unknown>) => void
) {
  return useCallback(
    async (files: File[]) => {
      if (!files.length) return;

      updateAttributes({ uploading: true, error: null });

      try {
        const fileHandler = editor.extensionManager.extensions.find(
          (e) => e.name === "dreamFileHandler"
        );
        const connectableId = fileHandler?.options?.connectableId;

        const uploadedFiles: IUploadedFile[] = await uploadDreamFilesHeadless(files, {
          allowedTypes: ["image/png", "image/jpeg", "image/gif", "image/webp"],
          connectableId,
        });

        const newImages: IGalleryImage[] = uploadedFiles.map((file) => ({
          src: file.src,
          fileId: file.fileId,
          alt: file.fileName,
        }));

        updateAttributes({ images: [...images, ...newImages], uploading: false });
      } catch (err) {
        console.error("Failed to upload gallery images:", err);
        updateAttributes({ error: "Failed to upload images", uploading: false });
      }
    },
    [editor, images, updateAttributes]
  );
}

// --- Extracted Action Renderer ---
function ImageActionGroup({
  actions,
  variant,
}: {
  actions: IImageAction[];
  variant: "popover" | "lightbox";
}) {
  return (
    <Group
      gap={variant === "popover" ? "xs" : "sm"}
      className={variant === "popover" ? styles.imageMenuContent : undefined}
    >
      {actions.map((action) => (
        <Tooltip key={action.label} label={action.label} withArrow>
          {variant === "popover" ? (
            <PaperIcon
              aria-label={action.label}
              onClick={action.onClick}
              className={action.isDestructive ? styles.redIcon : undefined}
            >
              <action.icon />
            </PaperIcon>
          ) : (
            <button
              {...getButtonProps({ isActive: false })}
              aria-label={action.label}
              onClick={action.onClick}
            >
              <action.icon size={20} />
            </button>
          )}
        </Tooltip>
      ))}
    </Group>
  );
}

// --- Extracted Sub-Component for Image Interactions ---
interface IGalleryImageItemProps {
  img: IGalleryImage;
  index: number;
  isSelected: boolean;
  isEditorSelected: boolean;
  onSelect: (index: number) => void;
  onOpenLightbox: (index: number) => void;
  onKeyDown: (index: number, e: React.KeyboardEvent) => void;
  onRemove: (index: number) => void;
  onSplit: (index: number) => void;
  onDownload: (img: IGalleryImage) => void;
  onOpenNewTab: (img: IGalleryImage) => void;
  imageRef: (el: HTMLDivElement | null) => void;
}

function GalleryImageItem({
  img,
  index,
  isSelected,
  isEditorSelected,
  onSelect,
  onOpenLightbox,
  onKeyDown,
  onRemove,
  onSplit,
  onDownload,
  onOpenNewTab,
  imageRef,
}: IGalleryImageItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSelected) {
      onOpenLightbox(index);
    } else {
      onSelect(index);
    }
  };

  const actions: IImageAction[] = [
    { label: "Split from gallery", icon: SelectionBackgroundIcon, onClick: () => onSplit(index) },
    { label: "Download", icon: DownloadSimpleIcon, onClick: () => onDownload(img) },
    { label: "Open in new tab", icon: ArrowSquareOutIcon, onClick: () => onOpenNewTab(img) },
    {
      label: "Remove from gallery",
      icon: TrashIcon,
      onClick: () => onRemove(index),
      isDestructive: true,
    },
  ];

  return (
    <Popover
      opened={isSelected}
      position="top"
      withArrow
      shadow="md"
      offset={10}
      trapFocus={false}
      onChange={(opened) => !opened && isSelected && onSelect(-1)}
    >
      <Popover.Target>
        <div
          ref={imageRef}
          className={`${styles.imageItem} ${isSelected ? styles.imageSelected : ""}`}
          tabIndex={0}
          onClick={handleClick}
          onKeyDown={(e) => onKeyDown(index, e)}
          data-image-index={index}
        >
          {isEditorSelected && (
            <ActionIcon
              className={styles.removeButton}
              size="sm"
              variant="filled"
              color="red"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(index);
              }}
              title="Remove image"
              aria-label="Remove image"
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
      </Popover.Target>

      <Popover.Dropdown p="xs">
        <ImageActionGroup actions={actions} variant="popover" />
      </Popover.Dropdown>
    </Popover>
  );
}

// --- Main Components ---
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
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { uploading, error } = node.attrs;
  const currentLayout = (node.attrs.layout as IGalleryLayout) || "grid";
  const images = (node.attrs.images as IGalleryImage[]) || [];

  const lightboxItems: IPaperLightboxItem[] = useMemo(() => {
    return images.map((img, idx) => ({
      id: img.fileId || idx,
      type: "image",
      src: img.src,
      alt: img.alt,
    }));
  }, [images]);

  const handleFiles = useGalleryUpload(editor, images, updateAttributes);

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
    if (e.dataTransfer.files?.length) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleImageSelection = (index: number) => {
    setSelectedImageIndex(index === -1 ? null : index);
  };

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
    setSelectedImageIndex(null);
  };

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
    }
  };

  const removeImage = (indexToRemove: number) => {
    const updatedImages = images.filter((_, index) => index !== indexToRemove);
    updateAttributes({ images: updatedImages });
    setSelectedImageIndex(null);
  };

  const splitImageFromGallery = (index: number) => {
    const imageToSplit = images[index];
    if (!imageToSplit) return;

    const nodePos = getPos();
    if (typeof nodePos !== "number") return;

    const dreamImageAttrs = {
      src: imageToSplit.src,
      alt: imageToSplit.alt || "",
      fileId: imageToSplit.fileId,
      width: "100%",
      viewMode: "expanded",
    };

    const updatedImages = images.filter((_, i) => i !== index);

    const transaction = editor.chain().focus();

    if (updatedImages.length === 0) {
      transaction
        .deleteRange({ from: nodePos, to: nodePos + node.nodeSize })
        .insertContentAt(nodePos, { type: "dreamImage", attrs: dreamImageAttrs });
    } else {
      transaction
        .updateAttributes("dreamGallery", { images: updatedImages })
        .insertContentAt(nodePos + node.nodeSize, { type: "dreamImage", attrs: dreamImageAttrs });
    }

    transaction.run();
    setSelectedImageIndex(null);
  };

  const handleDownloadImage = (image: IGalleryImage) => {
    const link = document.createElement("a");
    link.href = image.src;
    link.download = image.alt || "image";
    link.target = "_blank";
    link.click();
  };

  const handleOpenInNewTab = (image: IGalleryImage) => {
    window.open(image.src, "_blank");
  };

  // Construct actions for the lightbox context
  const getLightboxActions = (index: number): IImageAction[] => [
    {
      label: "Split from gallery",
      icon: SelectionBackgroundIcon,
      onClick: () => {
        splitImageFromGallery(index);
        setLightboxOpen(false);
      },
    },
    {
      label: "Download",
      icon: DownloadSimpleIcon,
      onClick: () => handleDownloadImage(images[index]),
    },
    {
      label: "Open in new tab",
      icon: ArrowSquareOutIcon,
      onClick: () => handleOpenInNewTab(images[index]),
    },
    {
      label: "Remove from gallery",
      icon: TrashIcon,
      isDestructive: true,
      onClick: () => {
        removeImage(index);
        if (images.length <= 1) {
          setLightboxOpen(false);
        } else if (index >= images.length - 1) {
          setCurrentImageIndex(Math.max(0, images.length - 2));
        }
      },
    },
  ];

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

      {/* Extracted React-Rendered Image Content */}
      <div className={styles.content}>
        {images.map((img, index) => (
          <GalleryImageItem
            key={`${img.fileId || index}-${img.src}`}
            img={img}
            index={index}
            isSelected={selectedImageIndex === index}
            isEditorSelected={selected}
            onSelect={handleImageSelection}
            onOpenLightbox={openLightbox}
            onKeyDown={handleImageKeyDown}
            onRemove={removeImage}
            onSplit={splitImageFromGallery}
            onDownload={handleDownloadImage}
            onOpenNewTab={handleOpenInNewTab}
            imageRef={(el) => (imageRefs.current[index] = el)}
          />
        ))}
      </div>

      {/* Lightbox */}
      <PaperLightbox
        opened={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        items={lightboxItems}
        currentIndex={currentImageIndex}
        onIndexChange={setCurrentImageIndex}
        renderActions={(_item, index) => (
          <ImageActionGroup actions={getLightboxActions(index)} variant="lightbox" />
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

  const handleUpdateAttributes = useCallback(
    (attrs: Record<string, unknown>) => {
      editor.chain().focus().updateAttributes("dreamGallery", attrs).run();
    },
    [editor]
  );

  const performUpload = useGalleryUpload(editor, images, handleUpdateAttributes);

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (!nodeExists) return;
      await performUpload(files);
    },
    [nodeExists, performUpload]
  );

  return (
    <Group gap="xs">
      <div className={buttonGroup}>
        <Tooltip label="Grid Layout" withArrow>
          <button
            {...getButtonProps({ isActive: layout === "grid" })}
            aria-label="Set gallery layout to grid"
            onClick={() => handleChangeLayout("grid")}
            type="button"
          >
            <SquaresFourIcon size={20} />
          </button>
        </Tooltip>

        <Tooltip label="Masonry Layout" withArrow>
          <button
            {...getButtonProps({ isActive: layout === "masonry" })}
            aria-label="Set gallery layout to masonry"
            onClick={() => handleChangeLayout("masonry")}
            type="button"
          >
            <RowsIcon size={20} />
          </button>
        </Tooltip>

        <Tooltip label="Filmstrip Layout" withArrow>
          <button
            {...getButtonProps({ isActive: layout === "filmstrip" })}
            aria-label="Set gallery layout to filmstrip"
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
                aria-label="Add images to gallery"
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
