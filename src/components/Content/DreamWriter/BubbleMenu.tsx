import {
  BubbleMenu as TippyBubbleMenu,
  Editor as IEditor,
  BubbleMenuProps,
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
import { ActionIcon, Group, Stack, Textarea, TextInput } from "@mantine/core";
import { NodeSelection } from "@tiptap/pm/state";
import { showNotification } from "@mantine/notifications";
import { CheckIcon, TrashSimpleIcon, XIcon } from "@phosphor-icons/react";
import { RefObject, useEffect, useState } from "react";
import { DreamYouTubeMenu } from "./nodes/DreamYouTube";

interface IBubbleMenuProps {
  editor: IEditor | null;
  onVisibilityChange?: (isVisible: boolean) => void;
  boundaryRef?: RefObject<HTMLElement>;
}

export default function BubbleMenu({
  editor,
  onVisibilityChange,
  boundaryRef,
}: IBubbleMenuProps) {
  const isImage = editor?.isActive("dreamImage");
  const isDreamIdeaActive = editor?.isActive("dreamIdea");
  const isInlineMath = editor?.isActive("inlineMath");
  const isBlockMath = editor?.isActive("blockMath");
  const isDreamYouTube = editor?.isActive("dreamYouTube");
  const isDreamTable = editor?.isActive("dreamTable");
  const hidden = isDreamTable;

  const { isMobile } = useLayout();

  const shouldShowHandler = ({
    editor: currentEditor,
    from,
    to,
  }: any): boolean => {
    if (hidden) {
      return false;
    }
    const { selection } = currentEditor.state;
    const isTextSelected = from !== to;

    const shouldBeVisible = isTextSelected && selection.content().size > 0;

    onVisibilityChange?.(shouldBeVisible);

    return shouldBeVisible;
  };

  const menuProps = {
    editor: editor,
    className: styles.bubbleMenu,
    tippyOptions: {
      duration: 100,
      placement: "bottom" as const,
      popperOptions: {
        modifiers: [
          {
            name: "preventOverflow",
            options: {
              boundary: boundaryRef?.current || "clippingParents",
            },
          },
          {
            name: "flip",
            options: {
              // Also use the same boundary for the flip modifier
              boundary: boundaryRef?.current || "clippingParents",
            },
          },
        ],
      },
    },
    shouldShow: shouldShowHandler,
  };

  if (!editor) {
    return null;
  }

  if (isDreamTable) {
    return (
      <TippyBubbleMenu {...menuProps}>
        <div></div>
      </TippyBubbleMenu>
    );
  }

  if (isImage) {
    return (
      <TippyBubbleMenu {...menuProps}>
        <DreamImageMenu editor={editor} />
      </TippyBubbleMenu>
    );
  }
  if (isInlineMath) {
    return (
      <TippyBubbleMenu {...menuProps}>
        <InlineMathMenu editor={editor} />
      </TippyBubbleMenu>
    );
  }
  if (isBlockMath) {
    return (
      <TippyBubbleMenu {...menuProps}>
        <BlockMathMenu editor={editor} />
      </TippyBubbleMenu>
    );
  }
  if (isDreamYouTube) {
    return (
      <TippyBubbleMenu {...menuProps}>
        <DreamYouTubeMenu editor={editor} />
      </TippyBubbleMenu>
    );
  }

  return (
    <TippyBubbleMenu {...menuProps}>
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

const InlineMathMenu = ({ editor }: { editor: IEditor }) => {
  const isMathNode = editor.isActive("inlineMath");

  const getLatex = () => {
    try {
      const selection = editor.state.selection as NodeSelection;
      const node = selection.node;
      if (!selection || !node) {
        throw new Error("Selection or node is falsey");
      }
      return node.attrs.latex;
    } catch (error) {
      console.error(error);
      showNotification({
        title: "Error",
        message: "Error processing math",
        color: "red",
      });
    }
  };

  const setLatex = (latex: string) => {
    editor
      .chain()
      .focus()
      .updateInlineMath({
        latex,
      })
      .run();
  };

  const deleteMathNode = () => {
    editor.chain().focus().deleteRange(editor.state.selection).run();
  };

  const [newLatex, setNewLatex] = useState(getLatex());

  if (!isMathNode) return null;

  return (
    <Group gap="xs">
      <TextInput
        defaultValue={newLatex}
        onChange={(event) => setNewLatex(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            setLatex(newLatex);
          }
        }}
        size="sm"
        variant="unstyled"
        radius="md"
      />
      <Group gap="xs">
        <ActionIcon
          onClick={() => setLatex(newLatex)}
          size="sm"
          color="gray"
          variant="light"
        >
          <CheckIcon />
        </ActionIcon>
        <ActionIcon
          onClick={() => deleteMathNode()}
          size="sm"
          color="gray"
          variant="light"
        >
          <TrashSimpleIcon />
        </ActionIcon>
      </Group>
    </Group>
  );
};

const BlockMathMenu = ({ editor }: { editor: IEditor }) => {
  const isMathNode = editor.isActive("blockMath");

  const getLatex = () => {
    try {
      const selection = editor.state.selection as NodeSelection;
      const node = selection.node;
      if (!selection || !node) {
        throw new Error("Selection or node is falsey");
      }
      return node.attrs.latex;
    } catch (error) {
      console.error(error);
      showNotification({
        title: "Error",
        message: "Error processing math block",
        color: "red",
      });
    }
  };

  const setLatex = (latex: string) => {
    editor
      .chain()
      .focus()
      .updateBlockMath({
        latex,
      })
      .blur()
      .run();
  };

  const deleteMathNode = () => {
    editor.chain().focus().deleteRange(editor.state.selection).run();
  };

  const [newLatex, setNewLatex] = useState(getLatex());

  if (!isMathNode) return null;

  return (
    <Stack gap="xs" miw={"300px"}>
      <Textarea
        defaultValue={newLatex}
        onChange={(event) => setNewLatex(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            setLatex(newLatex);
          }
        }}
        size="sm"
        variant="unstyled"
        radius="md"
      />
      <Group gap="xs">
        <ActionIcon
          onClick={() => setLatex(newLatex)}
          size="sm"
          color="gray"
          variant="light"
        >
          <CheckIcon />
        </ActionIcon>
        <ActionIcon
          onClick={() => deleteMathNode()}
          size="sm"
          color="gray"
          variant="light"
        >
          <TrashSimpleIcon />
        </ActionIcon>
        <ActionIcon
          onClick={() => editor.chain().focus().blur().run()}
          size="sm"
          color="gray"
          variant="light"
        >
          <XIcon />
        </ActionIcon>
      </Group>
    </Stack>
  );
};
