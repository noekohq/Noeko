import React, { useEffect, useState } from "react";
import { Editor as IEditor } from "@tiptap/react";
import {
  BracketsAngle,
  ChatTeardrop,
  Check,
  Code,
  CodeSimple,
  DotsThreeVertical,
  Download,
  Image,
  Link,
  MagicWand,
  Quotes,
  TextB,
  Textbox,
  TextItalic,
  TextStrikethrough,
  TextUnderline,
  X,
} from "@phosphor-icons/react";
import styles from "./Options.module.scss";
import useFetch from "../../../hooks/useFetch";
import { useSettings } from "../../../contexts/SettingsContext";
import Loading from "../../Display/Loading/Loading";
import { markdownToHtml } from "../../../utils/formatting";
import {
  ActionIcon,
  Button,
  FileInput,
  Flex,
  Grid,
  Group,
  Modal,
  Popover,
  TextInput,
} from "@mantine/core";
import { imagesPath } from "../../../globals/static";
import { showNotification } from "@mantine/notifications";

interface OptionProps {
  editor: IEditor | null;
}

export function BoldButton({ editor }: OptionProps) {
  const makeBold = () => editor?.chain().focus().toggleBold().run();

  const isBold = editor?.isActive("bold");

  return (
    <ActionIcon
      variant={isBold ? "filled" : "filled"}
      onClick={makeBold}
      title="Toggle Bold"
    >
      <TextB weight="bold" />
    </ActionIcon>
  );
}

export function ItalicButton({ editor }: OptionProps) {
  const makeItalic = () => editor?.chain().focus().toggleItalic().run();

  const isItalic = editor?.isActive("italic");

  return (
    <ActionIcon
      variant={isItalic ? "filled" : "light"}
      onClick={makeItalic}
      title="Toggle Italic"
    >
      <TextItalic weight="bold" />
    </ActionIcon>
  );
}

export function StrikeThroughButton({ editor }: OptionProps) {
  const isStrike = editor?.isActive("strike");

  return (
    <ActionIcon
      variant={isStrike ? "filled" : "light"}
      onClick={() => editor?.chain().focus().toggleStrike().run()}
      title="Toggle Strike Through"
    >
      <TextStrikethrough weight="bold" />
    </ActionIcon>
  );
}

export function UnderlineButton({ editor }: OptionProps) {
  const makeUnderline = () => editor?.chain().focus().toggleUnderline().run();

  const isUnderline = editor?.isActive("underline");

  return (
    <ActionIcon
      variant={isUnderline ? "filled" : "light"}
      onClick={makeUnderline}
      title="Toggle Underline"
    >
      <TextUnderline weight="bold" />
    </ActionIcon>
  );
}

export function ParagraphButton({ editor }: OptionProps) {
  const toggleParagraph = () => editor?.chain().focus().setParagraph().run();

  const isActive = editor?.isActive("paragraph");

  return (
    <ActionIcon
      variant={isActive ? "filled" : "light"}
      onClick={toggleParagraph}
      title="Toggle Paragraph"
    >
      P
    </ActionIcon>
  );
}

interface HeadingProps extends OptionProps {
  level: 1 | 2 | 3;
}
export function HeadingButton({ editor, level }: HeadingProps) {
  const toggleHeading = () =>
    editor?.chain().focus().toggleHeading({ level }).run();

  const isActive = editor?.isActive("heading", { level });

  return (
    <ActionIcon
      variant={isActive ? "filled" : "light"}
      onClick={toggleHeading}
      title="Toggle Heading"
    >
      H{level}
    </ActionIcon>
  );
}

export function BlockquoteButton({ editor }: OptionProps) {
  const toggleBlockquote = () =>
    editor?.chain().focus().toggleBlockquote().run();

  const isActive = editor?.isActive("blockquote");

  return (
    <ActionIcon
      variant={isActive ? "filled" : "light"}
      onClick={toggleBlockquote}
      title="Toggle Blockquote"
    >
      <Quotes weight="bold" />
    </ActionIcon>
  );
}

export function LinkButton({ editor }: OptionProps) {
  const isLink = editor?.isActive("link");
  const [settingLink, setSettingLink] = useState(false);
  const [href, setHREF] = useState("");
  const setTextLink = () => {
    editor?.chain().focus().setLink({ href }).run();
  };

  const toggleLink = () => {
    if (isLink) {
      editor?.chain().focus().unsetLink().run();
    } else {
      editor?.chain().focus().blur().run();
      const selection = editor?.view.state.selection;
      const state = editor?.view.state;
      if (!selection || !state) {
        return;
      }
      const { to, from } = selection;
      const text = state.doc.textBetween(from, to);
    }
  };

  return (
    <ActionIcon
      variant={isLink ? "filled" : "light"}
      onClick={() => {
        toggleLink();
      }}
      title="Toggle Link"
    >
      <Link weight="bold" />
      <Modal opened={settingLink} onClose={() => setSettingLink(false)}>
        <Grid>
          <Grid.Col span={{ sm: 12 }}>
            <TextInput
              type="text"
              value={href}
              onChange={(e) => setHREF(e.target.value)}
            />
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Group justify="right">
              <Button onClick={setTextLink}>Set Link</Button>
            </Group>
          </Grid.Col>
        </Grid>
      </Modal>
    </ActionIcon>
  );
}

export function ExportAsHTMLButton({ editor }: OptionProps) {
  const exportAsHTML = () => {
    const html = editor?.getHTML();
    if (!html) {
      return;
    }

    // Parse the HTML string into a DOM structure
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Function to recursively remove unwanted attributes
    const cleanNode = (node: HTMLElement) => {
      node.removeAttribute("class");
      node.removeAttribute("style");
      Array.from(node.children).forEach((child) =>
        cleanNode(child as HTMLElement),
      );
    };

    // Clean the body of the parsed document
    cleanNode(doc.body);

    // Serialize the cleaned DOM back into an HTML string
    const cleanedHTML = doc.body.innerHTML;

    // Create a Blob from the cleaned HTML string and trigger the download
    const blob = new Blob([cleanedHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "export.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <ActionIcon variant="default" onClick={exportAsHTML} title="Export as HTML">
      <Download weight="bold" />
    </ActionIcon>
  );
}

export function CopyAsHTMLButton({ editor }: OptionProps) {
  const copyAsHTML = () => {
    const html = editor?.getHTML();
    if (!html) {
      return;
    }

    // Parse the HTML string into a DOM structure
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Function to recursively remove unwanted attributes
    const cleanNode = (node: HTMLElement) => {
      node.removeAttribute("class");
      node.removeAttribute("style");
      Array.from(node.children).forEach((child) =>
        cleanNode(child as HTMLElement),
      );
    };

    // Clean the body of the parsed document
    cleanNode(doc.body);

    // Serialize the cleaned DOM back into an HTML string
    const cleanedHTML = doc.body.innerHTML;

    // Copy the cleaned HTML to the clipboard
    navigator.clipboard
      .writeText(cleanedHTML)
      .then(() => {
        showNotification({
          title: "Success",
          message: "HTML copied to clipboard",
        });
      })
      .catch(() => {
        showNotification({
          title: "Error",
          message: "Failed to copy HTML to clipboard",
          color: "red",
        });
      });
  };

  return (
    <ActionIcon variant="default" onClick={copyAsHTML} title="Copy as HTML">
      <BracketsAngle weight="bold" />
    </ActionIcon>
  );
}

export function CodeBlockButton({ editor }: OptionProps) {
  const isCode = editor?.isActive("codeBlock");

  const toggleCode = () => {
    editor?.chain().focus().toggleCodeBlock().run();
  };

  return (
    <ActionIcon
      variant={isCode ? "filled" : "light"}
      onClick={() => toggleCode()}
      title="Toggle Code Block"
    >
      <Code weight="bold" />
    </ActionIcon>
  );
}

export function CodeInlineButton({ editor }: OptionProps) {
  const isCode = editor?.isActive("code");

  const toggleCode = () => {
    if (isCode) {
      editor?.chain().focus().unsetCode().run();
    } else {
      editor?.chain().focus().setCode().run();
    }
  };

  return (
    <ActionIcon
      variant={isCode ? "filled" : "light"}
      onClick={() => toggleCode()}
      title="Toggle Code"
    >
      <CodeSimple weight="bold" />
    </ActionIcon>
  );
}

export function ExtraButton({
  editor,
  children,
}: OptionProps & {
  children: React.ReactNode;
}) {
  // just a bunch of buttons in a dropdown
  const [opened, setOpened] = useState(false);

  return (
    <div>
      <Popover opened={opened} onClose={() => setOpened(false)}>
        <Popover.Target>
          <ActionIcon
            variant="default"
            title="Extra"
            onClick={() => setOpened(!opened)}
          >
            {opened ? <X weight="bold" /> : <DotsThreeVertical weight="bold" />}
          </ActionIcon>
        </Popover.Target>
        <Popover.Dropdown>
          <Flex direction="row" gap="sm">
            {children}
          </Flex>
        </Popover.Dropdown>
      </Popover>
    </div>
  );
}
