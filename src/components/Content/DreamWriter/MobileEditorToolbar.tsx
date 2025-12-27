import { Editor as IEditor } from "@tiptap/react";
import styles from "./MobileEditorToolbar.module.scss";
import {
  BlockquoteButton,
  BoldButton,
  CodeMenuButton,
  HeadingMenuButton,
  HighlightButton,
  ItalicButton,
  LinkButton,
  ListMenuButton,
  MagicMenuButton,
  MathMenuButton,
  StrikeThroughButton,
  UnderlineButton,
} from "./Options";
import { createPortal } from "react-dom";

interface IMobileEditorToolbarProps {
  editor: IEditor | null;
  isVisible: boolean;
}

export default function MobileEditorToolbar({
  editor,
  isVisible,
}: IMobileEditorToolbarProps) {
  // Removed: useKeyboardOffset hook (caused the jitter)

  if (!editor) {
    return null;
  }

  return createPortal(
    <div
      // Removed: style={{ bottom: ... }}
      className={`${styles.toolbar} ${isVisible ? styles.visible : ""}`}
    >
      <div className={styles.scroller}>
        <div className={styles.buttonGroup}>
          <MagicMenuButton visible={isVisible} editor={editor} />
        </div>
        <div className={styles.buttonGroup}>
          <BoldButton visible={isVisible} editor={editor} />
          <ItalicButton visible={isVisible} editor={editor} />
          <UnderlineButton visible={isVisible} editor={editor} />
          <StrikeThroughButton visible={isVisible} editor={editor} />
          <LinkButton visible={isVisible} editor={editor} />
          <BlockquoteButton visible={isVisible} editor={editor} />
          <HighlightButton visible={isVisible} editor={editor} />
        </div>
        <div className={styles.buttonGroup}>
          <HeadingMenuButton visible={isVisible} editor={editor} />
          <ListMenuButton visible={isVisible} editor={editor} />
          <CodeMenuButton visible={isVisible} editor={editor} />
          <MathMenuButton visible={isVisible} editor={editor} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
