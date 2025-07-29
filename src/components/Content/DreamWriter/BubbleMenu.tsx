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
  CodeBlockButton,
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
} from "./Options";

export default function BubbleMenu({ editor }: { editor: IEditor | null }) {
  const isImage = editor?.isActive("image");
  const isDreamIdeaActive = editor?.isActive("dreamIdea");
  const hidden = isImage;

  if (!editor) {
    return null;
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
            </div>
            <div className={styles.buttonGroup}>
              <LinkButton editor={editor} />
              <BlockquoteButton editor={editor} />
              <CodeBlockButton editor={editor} />
              <MathInlineButton editor={editor} />
              <MathBlockButton editor={editor} />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.buttonGroup}>
              <HeadingMenuButton editor={editor} />
              <ListMenuButton editor={editor} />
            </div>
          </div>
        </>
      )}
    </TippyBubbleMenu>
  );
}
