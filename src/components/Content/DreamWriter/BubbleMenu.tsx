import {
  BubbleMenu as TippyBubbleMenu,
  Editor as IEditor,
} from "@tiptap/react";
import styles from "./BubbleMenu.module.scss";
import {
  BlockquoteButton,
  BoldButton,
  ItalicButton,
  LinkButton,
  UnderlineButton,
  CodeMenuButton,
  StrikeThroughButton,
  NewIdea,
  ConnectIdea,
  CopySelectionButton,
  CutButton,
  PasteButton,
  SelectAllButton,
  MathMenuButton,
  HeadingMenuButton,
  ListMenuButton,
  SpyglassButton,
  TaskButton,
  MagicMenuButton,
  HighlightButton,
} from "./Options";
import { DreamImageMenu } from "./nodes/DreamImage";
import { useLayout } from "../../../contexts/LayoutContext";

export default function BubbleMenu({ editor }: { editor: IEditor | null }) {
  const isImage = editor?.isActive("dreamImage");
  const isDreamIdeaActive = editor?.isActive("dreamIdea");
  const hidden = isImage;

  const { isMobile } = useLayout();

  if (!editor) {
    return null;
  }

  if (isImage) {
    return (
      <TippyBubbleMenu
        editor={editor}
        className={styles.bubbleMenu}
        tippyOptions={{ duration: 100, placement: "bottom" }}
      >
        <DreamImageMenu editor={editor} />
      </TippyBubbleMenu>
    );
  }

  return (
    <TippyBubbleMenu
      editor={editor}
      className={styles.bubbleMenu}
      tippyOptions={{ duration: 100, placement: "bottom" }}
    >
      {!hidden && (
        <>
          {isMobile && (
            <div className={styles.row}>
              <div className={styles.buttonGroup}>
                <CopySelectionButton editor={editor} />
                <CutButton editor={editor} />
                <PasteButton editor={editor} />
                <SelectAllButton editor={editor} />
              </div>
              <div className={styles.buttonGroup}>
                <MagicMenuButton editor={editor} />
              </div>
            </div>
          )}
          <div className={styles.row}>
            {!isMobile && (
              <div className={styles.buttonGroup}>
                <MagicMenuButton editor={editor} />
              </div>
            )}
            <div className={styles.buttonGroup}>
              <BoldButton editor={editor} />
              <ItalicButton editor={editor} />
              <UnderlineButton editor={editor} />
              <StrikeThroughButton editor={editor} />
              <LinkButton editor={editor} />
              <BlockquoteButton editor={editor} />
              <HighlightButton editor={editor} />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.buttonGroup}>
              <HeadingMenuButton editor={editor} />
              <ListMenuButton editor={editor} />
              <CodeMenuButton editor={editor} />
              <MathMenuButton editor={editor} />
            </div>
          </div>
        </>
      )}
    </TippyBubbleMenu>
  );
}
