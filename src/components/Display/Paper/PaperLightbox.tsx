import { ActionIcon, Portal, RemoveScroll } from "@mantine/core";
import { CaretLeftIcon, CaretRightIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, ReactNode } from "react";
import styles from "./PaperLightbox.module.scss";

export interface IPaperLightboxItem {
  id: string | number;
  type: "image" | "custom";
  src?: string;
  alt?: string;
  render?: () => ReactNode;
  meta?: any;
}

interface PaperLightboxProps {
  opened: boolean;
  onClose: () => void;
  items: IPaperLightboxItem[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  renderActions?: (currentItem: IPaperLightboxItem, index: number) => ReactNode;
}

export function PaperLightbox({
  opened,
  onClose,
  items,
  currentIndex,
  onIndexChange,
  renderActions,
}: PaperLightboxProps) {
  const currentItem = items[currentIndex];

  useEffect(() => {
    if (!opened) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        onIndexChange(currentIndex === 0 ? items.length - 1 : currentIndex - 1);
      } else if (e.key === "ArrowRight") {
        onIndexChange(currentIndex === items.length - 1 ? 0 : currentIndex + 1);
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [opened, currentIndex, items.length, onIndexChange, onClose]);

  if (!opened || !currentItem) return null;

  return (
    <Portal>
      <RemoveScroll>
        <div className={styles.lightboxOverlay}>
          {/* Close Button */}
          <ActionIcon
            className={styles.lightboxCloseButton}
            size="xl"
            variant="transparent"
            onClick={onClose}
          >
            <XIcon size={24} color="white" />
          </ActionIcon>

          {/* Counter */}
          {items.length > 1 && (
            <div className={styles.lightboxCounter}>
              {currentIndex + 1} / {items.length}
            </div>
          )}

          {/* Left Navigation */}
          {items.length > 1 && (
            <ActionIcon
              className={`${styles.lightboxNavButton} ${styles.lightboxNavButtonLeft}`}
              size="xl"
              variant="transparent"
              onClick={() =>
                onIndexChange(currentIndex === 0 ? items.length - 1 : currentIndex - 1)
              }
            >
              <CaretLeftIcon size={32} color="white" />
            </ActionIcon>
          )}

          {/* Main Content Area */}
          <div className={styles.lightboxContentContainer}>
            {currentItem.type === "image" && currentItem.src ? (
              <img
                src={currentItem.src}
                alt={currentItem.alt || `Preview ${currentIndex + 1}`}
                className={styles.lightboxImage}
              />
            ) : currentItem.render ? (
              currentItem.render()
            ) : null}
          </div>

          {/* Right Navigation */}
          {items.length > 1 && (
            <ActionIcon
              className={`${styles.lightboxNavButton} ${styles.lightboxNavButtonRight}`}
              size="xl"
              variant="transparent"
              onClick={() =>
                onIndexChange(currentIndex === items.length - 1 ? 0 : currentIndex + 1)
              }
            >
              <CaretRightIcon size={32} color="white" />
            </ActionIcon>
          )}

          {/* Contextual Actions */}
          {renderActions && (
            <div className={styles.lightboxActionBar}>
              {renderActions(currentItem, currentIndex)}
            </div>
          )}
        </div>
      </RemoveScroll>
    </Portal>
  );
}
