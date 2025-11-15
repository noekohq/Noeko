import { createPortal } from "react-dom";
import styles from "./PaperDrawer.module.scss";

interface IPaperDrawerProps {
  opened?: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}

export default function PaperDrawer({
  opened = false,
  onClose,
  children,
}: IPaperDrawerProps) {
  if (!opened) {
    return null;
  }

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.content}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
