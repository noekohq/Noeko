import React, { useCallback, useEffect, useState } from "react";
import { Editor as IEditor } from "@tiptap/react";
import {
  BracketsAngle,
  CheckSquare,
  Code,
  CodeSimple,
  DotsThreeVertical,
  Download,
  Link,
  ListBullets,
  ListChecks,
  ListNumbers,
  Quotes,
  TextB,
  TextItalic,
  TextStrikethrough,
  TextUnderline,
  X,
} from "@phosphor-icons/react";
import {
  ActionIcon,
  Button,
  Flex,
  Group,
  Popover,
  TextInput,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";

interface OptionProps {
  editor: IEditor | null;
}

export function BoldButton({ editor }: OptionProps) {
  const makeBold = () => editor?.chain().focus().toggleBold().run();

  const isBold = editor?.isActive("bold");

  return (
    <ActionIcon
      variant={isBold ? "filled" : "light"}
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

export function LinkButton({ editor }: OptionProps) {
  const [popoverOpened, setPopoverOpened] = useState(false);
  // Initialize href from current selection if it's already a link
  const [href, setHREF] = useState(
    () => editor?.getAttributes("link").href || "",
  );

  // Check if the current selection/cursor is within a link
  const isLink = editor?.isActive("link");

  // Update href state if the link attribute changes externally or on selection change
  // This helps pre-fill the input when the cursor moves into an existing link
  useEffect(() => {
    if (isLink && editor) {
      const currentHref = editor.getAttributes("link").href;
      setHREF(currentHref);
    }
    // We only want to re-run this when `isLink` or `editor` changes specifically
    // related to the link state, not on every editor update.
  }, [isLink, editor]);

  // Function to set or update the link
  const setLink = useCallback(() => {
    if (!editor) return;

    // If URL is empty, unset the link
    if (href === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setPopoverOpened(false); // Close popover
      return;
    }

    // Set the link mark
    editor
      .chain()
      .focus()
      .extendMarkRange("link") // Ensure the range covers the link mark
      .setLink({ href })
      .run();

    setPopoverOpened(false); // Close popover after setting link
  }, [editor, href]);

  // Function to handle the main button click
  const handleButtonClick = () => {
    if (!editor) return;

    if (isLink) {
      // If it's already a link, unset it directly
      editor.chain().focus().unsetLink().run();
      setHREF(""); // Clear the href state
    } else {
      // If not a link, open the popover to add one
      // Potentially pre-fill href based on selection or clipboard? (optional)
      // For now, just ensure it's cleared or uses the last value
      // setHREF(""); // Optionally clear href state when opening for a new link
      setPopoverOpened((o) => !o); // Toggle popover open/closed
    }
  };

  // Handle closing the popover
  const handleClosePopover = () => {
    setPopoverOpened(false);
    // Optionally reset href if you don't want it to persist
    // setHREF(editor?.getAttributes("link").href || "");
  };

  // Handle Enter key press in the TextInput
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent potential form submission
      setLink();
    }
  };

  return (
    <Popover
      opened={popoverOpened}
      onClose={handleClosePopover} // Use the handler
      position="bottom"
      withArrow
      shadow="md"
      trapFocus // Keep focus within the popover
    >
      <Popover.Target>
        <ActionIcon
          variant={isLink ? "filled" : "light"}
          onClick={handleButtonClick}
          title={isLink ? "Remove Link" : "Set Link"}
          disabled={!editor} // Disable if editor is null
        >
          <Link weight="bold" />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Flex direction="column" gap="xs">
          {" "}
          {/* Use Flex for layout */}
          <TextInput
            placeholder="Enter URL"
            type="url"
            value={href}
            onChange={(e) => setHREF(e.target.value)}
            onKeyDown={handleKeyDown} // Add keydown handler
            data-autofocus // Focus input when popover opens
          />
          <Group justify="right">
            {" "}
            {/* Align button to the right */}
            <Button onClick={setLink} size="xs">
              {" "}
              {/* Use smaller button */}
              {href === "" ? "Remove Link" : "Set Link"}
            </Button>
          </Group>
        </Flex>
      </Popover.Dropdown>
    </Popover>
  );
}

export function TaskListButton({ editor }: OptionProps) {
  // This check correctly reflects if the context is a task list
  const isActive = editor?.isActive("taskList");

  // This command works correctly on paragraphs, bullet lists,
  // ordered lists, and existing task lists.
  const toggleTaskList = () => {
    editor?.chain().focus().toggleTaskList().run();
  };

  const isDisabled = !editor;

  return (
    <ActionIcon
      variant={isActive ? "filled" : "light"}
      onClick={toggleTaskList}
      title="Toggle Task List"
      disabled={isDisabled}
    >
      <ListChecks weight="bold" />
    </ActionIcon>
  );
}

export function TaskItemButton({ editor }: OptionProps) {
  // Check if the current selection or node is part of a task list.
  // We check 'taskList' because toggling an item affects the entire list's state.
  const isActive = editor?.isActive("taskList");

  // Function to toggle the task list format.
  // This command handles paragraphs, other lists, and existing task lists correctly.
  const toggleTask = () => {
    editor?.chain().focus().toggleTaskList().run();
  };

  // Disable button if the editor instance is not available
  const isDisabled = !editor;

  return (
    <ActionIcon
      variant={isActive ? "filled" : "light"}
      onClick={toggleTask}
      title="Toggle Task Item / List" // Title reflects it toggles list state
      disabled={isDisabled}
    >
      {/* Using a checkmark icon to signify "item" */}
      <CheckSquare weight="bold" />
    </ActionIcon>
  );
}

export function OrderedListButton({ editor }: OptionProps) {
  // Check if the current selection or node is an ordered list
  const isActive = editor?.isActive("orderedList");

  // Function to toggle the ordered list format
  const toggleOrderedList = () => {
    editor?.chain().focus().toggleOrderedList().run();
  };

  // Disable button if the editor instance is not available
  const isDisabled = !editor;

  return (
    <ActionIcon
      variant={isActive ? "filled" : "light"} // Style based on active state
      onClick={toggleOrderedList}
      title="Toggle Ordered List"
      disabled={isDisabled}
    >
      <ListNumbers weight="bold" /> {/* Icon for ordered list */}
    </ActionIcon>
  );
}

/**
 * Button to toggle Bullet List formatting (e.g., •, •, •)
 */
export function BulletListButton({ editor }: OptionProps) {
  // Check if the current selection or node is a bullet list
  // Tiptap typically calls this 'bulletList' internally
  const isActive = editor?.isActive("bulletList");

  // Function to toggle the bullet list format
  const toggleBulletList = () => {
    editor?.chain().focus().toggleBulletList().run();
  };

  // Disable button if the editor instance is not available
  const isDisabled = !editor;

  return (
    <ActionIcon
      variant={isActive ? "filled" : "light"} // Style based on active state
      onClick={toggleBulletList}
      title="Toggle Bullet List"
      disabled={isDisabled}
    >
      <ListBullets weight="bold" /> {/* Icon for bullet list */}
    </ActionIcon>
  );
}
