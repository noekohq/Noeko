import { createPortal } from "react-dom";
import styles from "./PaperDrawer.module.scss";
import { XIcon } from "@phosphor-icons/react";
import { Text } from "@mantine/core";

interface IPaperDrawerProps {
  title: string;
  opened?: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  withCloseButton?: boolean;
}

export default function PaperDrawer({
  title,
  opened = false,
  onClose,
  children,
  withCloseButton = true,
}: IPaperDrawerProps) {
  if (!opened) {
    return null;
  }

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.body}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div className={styles.header}>
          <Text size="md" c="dark.3" fw="bold">
            {title}
          </Text>
          {withCloseButton && (
            <button className={styles.closeButton} onClick={onClose}>
              <XIcon weight="bold" />
            </button>
          )}
        </div>
        <div className={styles.content}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
