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
  MathInlineButton,
  MathBlockButton,
  HeadingMenuButton,
  ListMenuButton,
  SpyglassButton,
  TaskButton,
} from "./Options";
import { DreamImageMenu } from "./nodes/DreamImage";

export default function BubbleMenu({ editor }: { editor: IEditor | null }) {
  const isImage = editor?.isActive("dreamImage");
  const isDreamIdeaActive = editor?.isActive("dreamIdea");
  const hidden = isImage;

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
          <div className={styles.row}>
            <div className={styles.buttonGroup}>
              <BoldButton editor={editor} />
              <ItalicButton editor={editor} />
              <UnderlineButton editor={editor} />
              <StrikeThroughButton editor={editor} />
            </div>
            <div className={styles.buttonGroup}>
              <CopySelectionButton editor={editor} />
              <CutButton editor={editor} />
              <PasteButton editor={editor} />
              <SelectAllButton editor={editor} />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.buttonGroup}>
              <NewIdea editor={editor} />
              <ConnectIdea editor={editor} />
              <SpyglassButton editor={editor} />
              <TaskButton editor={editor} />
            </div>
            <div className={styles.buttonGroup}>
              <LinkButton editor={editor} />
              <BlockquoteButton editor={editor} />
              <MathInlineButton editor={editor} />
              <MathBlockButton editor={editor} />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.buttonGroup}>
              <HeadingMenuButton editor={editor} />
              <ListMenuButton editor={editor} />
              <CodeMenuButton editor={editor} />
            </div>
          </div>
        </>
      )}
    </TippyBubbleMenu>
  );
}
