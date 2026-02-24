import { BubbleMenu as BMenu, BubbleMenuProps } from "@tiptap/react/menus";
import { Editor as IEditor } from "@tiptap/react";
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
import { DreamFileMenu } from "./nodes/DreamFile";
import { useLayout } from "@/contexts/LayoutContext";
import { ActionIcon, Group, Stack, Textarea, TextInput } from "@mantine/core";
import { NodeSelection } from "@tiptap/pm/state";
import { showNotification } from "@mantine/notifications";
import { CheckIcon, TrashSimpleIcon, XIcon } from "@phosphor-icons/react";
import { RefObject, useEffect, useState } from "react";
import { DreamYouTubeMenu } from "./nodes/DreamYouTube";
import { flip, shift } from "@floating-ui/react";
import { DreamGalleryMenu } from "./nodes/DreamGallery";

interface IBubbleMenuProps {
  editor: IEditor | null;
  onVisibilityChange?: (isVisible: boolean) => void;
  boundaryRef?: RefObject<HTMLElement | null> | null;
}

export interface ISubMenuProps {
  editor: IEditor;
  classes: {
    group: string;
  };
}

export default function BubbleMenu({ editor, onVisibilityChange, boundaryRef }: IBubbleMenuProps) {
  const isImage = editor?.isActive("dreamImage");
  const isImageGallery = editor?.isActive("dreamGallery");
  const isDreamFile = editor?.isActive("dreamFile");
  const isDreamIdeaActive = editor?.isActive("dreamIdea");
  const isInlineMath = editor?.isActive("inlineMath");
  const isBlockMath = editor?.isActive("blockMath");
  const isDreamYouTube = editor?.isActive("dreamYouTube");
  const isDreamTable = editor?.isActive("dreamTable");
  const hidden = isDreamTable;

  const { isMobile } = useLayout();

  const [visible, setVisible] = useState(false);

  const shouldShowHandler = ({ editor: currentEditor, state, view }: any): boolean => {
    if (hidden) {
      onVisibilityChange?.(false);
      return false;
    }

    const { selection } = state;
    const { $from, from, to } = selection;

    if (state.doc.content.size === 0) {
      onVisibilityChange?.(false);
      return false;
    }

    const isTextSelected = from !== to;

    const isNodeSelected =
      selection instanceof NodeSelection &&
      [
        "dreamImage",
        "dreamGallery",
        "dreamFile",
        "inlineMath",
        "blockMath",
        "dreamYouTube",
      ].includes(selection.node.type.name);

    const shouldBeVisible = isTextSelected || isNodeSelected;

    onVisibilityChange?.(shouldBeVisible);
    setVisible(shouldBeVisible);

    return shouldBeVisible && !isMobile;
  };

  const menuProps: BubbleMenuProps = {
    editor: editor ?? undefined,
    className: styles.bubbleMenu,
    options: {
      placement: "bottom-start" as const,
      flip: true,
      shift: {
        boundary: boundaryRef?.current ?? undefined,
        padding: 0,
      },
    },
    shouldShow: shouldShowHandler,
  };

  if (!editor) {
    return null;
  }

  if (isDreamTable) {
    return (
      <BMenu {...menuProps}>
        <div></div>
      </BMenu>
    );
  }

  if (isImage) {
    return (
      <BMenu {...menuProps}>
        <DreamImageMenu
          editor={editor}
          classes={{
            group: styles.buttonGroup,
          }}
        />
      </BMenu>
    );
  }
  if (isImageGallery) {
    return (
      <BMenu {...menuProps}>
        <DreamGalleryMenu
          editor={editor}
          classes={{
            group: styles.buttonGroup,
          }}
        />
      </BMenu>
    );
  }
  if (isDreamFile) {
    return (
      <BMenu {...menuProps}>
        <DreamFileMenu
          editor={editor}
          classes={{
            group: styles.buttonGroup,
          }}
        />
      </BMenu>
    );
  }
  if (isInlineMath) {
    return (
      <BMenu {...menuProps}>
        <InlineMathMenu
          editor={editor}
          classes={{
            group: styles.buttonGroup,
          }}
        />
      </BMenu>
    );
  }
  if (isBlockMath) {
    return (
      <BMenu {...menuProps}>
        <BlockMathMenu
          editor={editor}
          classes={{
            group: styles.buttonGroup,
          }}
        />
      </BMenu>
    );
  }
  if (isDreamYouTube) {
    return (
      <BMenu {...menuProps}>
        <DreamYouTubeMenu
          editor={editor}
          classes={{
            group: styles.buttonGroup,
          }}
        />
      </BMenu>
    );
  }

  return (
    <BMenu {...menuProps}>
      {!hidden && (
        <>
          {isMobile && (
            <div className={styles.buttonGroup}>
              <CopySelectionButton visible={visible} editor={editor} />
              <CutButton visible={visible} editor={editor} />
              <PasteButton visible={visible} editor={editor} />
              <SelectAllButton visible={visible} editor={editor} />
            </div>
          )}
          <div className={styles.buttonGroup}>
            <MagicMenuButton visible={visible} editor={editor} />
          </div>
          <div className={styles.buttonGroup}>
            <BoldButton visible={visible} editor={editor} />
            <ItalicButton visible={visible} editor={editor} />
            <UnderlineButton visible={visible} editor={editor} />
            <StrikeThroughButton visible={visible} editor={editor} />
            <LinkButton visible={visible} editor={editor} />
            <BlockquoteButton visible={visible} editor={editor} />
            <HighlightButton visible={visible} editor={editor} />
          </div>
          <div className={styles.buttonGroup}>
            <HeadingMenuButton visible={visible} editor={editor} />
            <ListMenuButton visible={visible} editor={editor} />
            <CodeMenuButton visible={visible} editor={editor} />
            <MathMenuButton visible={visible} editor={editor} />
          </div>
        </>
      )}
    </BMenu>
  );
}

const InlineMathMenu = ({ editor }: ISubMenuProps) => {
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
        <ActionIcon onClick={() => setLatex(newLatex)} size="sm" color="gray" variant="light">
          <CheckIcon />
        </ActionIcon>
        <ActionIcon onClick={() => deleteMathNode()} size="sm" color="gray" variant="light">
          <TrashSimpleIcon />
        </ActionIcon>
      </Group>
    </Group>
  );
};

const BlockMathMenu = ({ editor }: ISubMenuProps) => {
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
        <ActionIcon onClick={() => setLatex(newLatex)} size="sm" color="gray" variant="light">
          <CheckIcon />
        </ActionIcon>
        <ActionIcon onClick={() => deleteMathNode()} size="sm" color="gray" variant="light">
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
