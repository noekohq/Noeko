import { createPortal } from "react-dom";
import { useEffect, useId } from "react";
import styles from "./PaperDrawer.module.scss";
import { XIcon } from "@phosphor-icons/react";
import { Text } from "@mantine/core";

interface IPaperDrawerProps {
  title: string;
  opened?: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  withCloseButton?: boolean;
  position?: "bottom" | "right";
}

export default function PaperDrawer({
  title,
  opened = false,
  onClose,
  children,
  withCloseButton = true,
  position = "bottom",
}: IPaperDrawerProps) {
  const titleId = useId();

  useEffect(() => {
    if (!opened || !onClose) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [opened, onClose]);

  if (!opened) {
    return null;
  }

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.body} ${styles[position]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div className={styles.header}>
          <Text id={titleId} size="md" c="dark.3" fw="bold">
            {title}
          </Text>
          {withCloseButton && (
            <button className={styles.closeButton} onClick={onClose} aria-label="Close drawer">
              <XIcon weight="bold" />
            </button>
          )}
        </div>
        <div className={styles.content}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
