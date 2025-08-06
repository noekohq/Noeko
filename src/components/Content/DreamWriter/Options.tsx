import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Editor as IEditor } from "@tiptap/react";
import {
  BracketsAngleIcon,
  CaretDownIcon,
  CheckIcon,
  CheckSquareIcon,
  ClipboardTextIcon,
  CodeIcon,
  CodeSimpleIcon,
  CopyIcon,
  DotsThreeVerticalIcon,
  DownloadIcon,
  FunctionIcon,
  InfoIcon,
  LightbulbIcon,
  LinkIcon,
  ListBulletsIcon,
  ListChecksIcon,
  ListIcon,
  ListNumbersIcon,
  MathOperationsIcon,
  QuotesIcon,
  ScissorsIcon,
  SelectionAll,
  SelectionAllIcon,
  TextBIcon,
  TextHIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  TextUnderlineIcon,
  UniteSquareIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
  ActionIcon,
  Button,
  CopyButton,
  Flex,
  Group,
  Menu,
  Popover,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { useForm } from "@mantine/form";
import DreamWriter from "./DreamWriter";
import { useInteraction } from "../../../contexts/InteractionContext";
import { useLandscape } from "../../../contexts/LandscapeContext";
import { createIdea, createIdeaConnection } from "../../../utils/ideas";
import { useDisclosure } from "@mantine/hooks";
import { RecordId } from "surrealdb";
import { SearchBar } from "../../Search/SearchBar";
import { useSearch } from "../../../contexts/SearchContext";
import { getNodeAsIdeaOrNull } from "../../../utils/graph";
import IdeaButton from "../../Display/Ideas/Interactions/IdeaButton";
import { ISafeIdea } from "../../../../app/database/models/ideas";
import { useNavigate } from "react-router";
import { SpyglassIcon } from "../../Utils/Icons/Icons";
import useRabbithole from "../../../hooks/useRabbithole";

interface OptionProps {
  editor: IEditor | null;
}

interface IGetButtonPropsArgs {
  isActive: boolean;
}
const getButtonProps = ({ isActive }: IGetButtonPropsArgs) => ({
  color: isActive ? "blue.7" : "dark.1",
  variant: isActive ? "filled" : "light",
});

export function CopySelectionButton({ editor }: OptionProps) {
  const getCopyText = () => {
    if (!editor || editor.state.selection.empty) return "";
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);
    return selectedText;
  };

  const isDisabled = !editor || editor.state.selection.empty;

  return (
    <CopyButton value={getCopyText()}>
      {({ copied, copy }) => {
        return (
          <ActionIcon
            {...getButtonProps({ isActive: false })}
            onClick={copy}
            title="Copy"
            disabled={isDisabled}
          >
            {copied ? <CheckIcon weight="bold" /> : <CopyIcon weight="bold" />}
          </ActionIcon>
        );
      }}
    </CopyButton>
  );
}

export function CutButton({ editor }: OptionProps) {
  const handleCut = () => {
    if (!editor || editor.state.selection.empty) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);

    if (selectedText) {
      navigator.clipboard.writeText(selectedText);
      editor.chain().focus().deleteSelection().run();
    }
  };

  const isDisabled = !editor || editor.state.selection.empty;

  return (
    <ActionIcon
      {...getButtonProps({ isActive: false })}
      onClick={handleCut}
      title="Cut"
      disabled={isDisabled}
    >
      <ScissorsIcon weight="bold" />
    </ActionIcon>
  );
}

export function PasteButton({ editor }: OptionProps) {
  const handlePaste = async () => {
    if (!editor) return;
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        editor.chain().focus().insertContent(text).run();
      }
    } catch (error) {
      console.error("Failed to paste text: ", error);
    }
  };

  return (
    <ActionIcon
      {...getButtonProps({ isActive: false })}
      onClick={handlePaste}
      title="Paste"
      disabled={!editor}
    >
      <ClipboardTextIcon weight="bold" />
    </ActionIcon>
  );
}

export function SelectAllButton({ editor }: OptionProps) {
  const handleSelectAll = () => {
    editor?.chain().focus().selectAll().run();
  };

  return (
    <ActionIcon
      {...getButtonProps({ isActive: false })}
      onClick={handleSelectAll}
      title="Select All"
      disabled={!editor}
    >
      <SelectionAllIcon weight="bold" />
    </ActionIcon>
  );
}

export function BoldButton({ editor }: OptionProps) {
  const makeBold = () => editor?.chain().focus().toggleBold().run();

  const isBold = !!editor?.isActive("bold");

  return (
    <ActionIcon
      {...getButtonProps({ isActive: isBold })}
      onClick={makeBold}
      title="Toggle Bold"
    >
      <TextBIcon weight="bold" />
    </ActionIcon>
  );
}

export function ItalicButton({ editor }: OptionProps) {
  const makeItalic = () => editor?.chain().focus().toggleItalic().run();

  const isItalic = !!editor?.isActive("italic");

  return (
    <ActionIcon
      {...getButtonProps({ isActive: isItalic })}
      onClick={makeItalic}
      title="Toggle Italic"
    >
      <TextItalicIcon weight="bold" />
    </ActionIcon>
  );
}

export function StrikeThroughButton({ editor }: OptionProps) {
  const isStrike = !!editor?.isActive("strike");

  return (
    <ActionIcon
      {...getButtonProps({ isActive: isStrike })}
      onClick={() => editor?.chain().focus().toggleStrike().run()}
      title="Toggle Strike Through"
    >
      <TextStrikethroughIcon weight="bold" />
    </ActionIcon>
  );
}

export function UnderlineButton({ editor }: OptionProps) {
  const makeUnderline = () => editor?.chain().focus().toggleUnderline().run();

  const isUnderline = !!editor?.isActive("underline");

  return (
    <ActionIcon
      {...getButtonProps({ isActive: isUnderline })}
      onClick={makeUnderline}
      title="Toggle Underline"
    >
      <TextUnderlineIcon weight="bold" />
    </ActionIcon>
  );
}

export function ParagraphButton({ editor }: OptionProps) {
  const toggleParagraph = () => editor?.chain().focus().setParagraph().run();

  const isActive = !!editor?.isActive("paragraph");

  return (
    <ActionIcon
      {...getButtonProps({ isActive })}
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

  const isActive = !!editor?.isActive("heading", { level });

  return (
    <ActionIcon
      {...getButtonProps({ isActive })}
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

  const isActive = !!editor?.isActive("blockquote");

  return (
    <ActionIcon
      {...getButtonProps({ isActive })}
      onClick={toggleBlockquote}
      title="Toggle Blockquote"
    >
      <QuotesIcon weight="bold" />
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
    <ActionIcon
      {...getButtonProps({ isActive: false })}
      onClick={exportAsHTML}
      title="Export as HTML"
    >
      <DownloadIcon weight="bold" />
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
    <ActionIcon
      {...getButtonProps({ isActive: false })}
      onClick={copyAsHTML}
      title="Copy as HTML"
    >
      <BracketsAngleIcon weight="bold" />
    </ActionIcon>
  );
}

export function CodeBlockButton({ editor }: OptionProps) {
  const isCode = !!editor?.isActive("codeBlock");

  const toggleCode = () => {
    editor?.chain().focus().toggleCodeBlock().run();
  };

  return (
    <ActionIcon
      {...getButtonProps({ isActive: isCode })}
      onClick={() => toggleCode()}
      title="Toggle Code Block"
    >
      <CodeIcon weight="bold" />
    </ActionIcon>
  );
}

export function CodeInlineButton({ editor }: OptionProps) {
  const isCode = !!editor?.isActive("code");

  const toggleCode = () => {
    if (isCode) {
      editor?.chain().focus().unsetCode().run();
    } else {
      editor?.chain().focus().setCode().run();
    }
  };

  return (
    <ActionIcon
      {...getButtonProps({ isActive: isCode })}
      onClick={() => toggleCode()}
      title="Toggle Code"
    >
      <CodeSimpleIcon weight="bold" />
    </ActionIcon>
  );
}

export function MathInlineButton({ editor }: OptionProps) {
  if (!editor) {
    return null;
  }

  const isMathInline = !!editor.isActive("math-inline");

  const handleMathClick = () => {
    if (isMathInline) {
      // If the cursor is in a math node, delete it as per the docs.
      // This will remove the node entirely.
      editor.chain().focus().deleteInlineMath().run();
    } else {
      // Get the currently selected text.
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to);

      // Insert an inline math node, using the selected text as the latex.
      // If no text is selected, it inserts an empty math node to be filled out.
      editor
        .chain()
        .focus()
        .deleteSelection()
        .insertInlineMath({ latex: selectedText })
        .run();
    }
  };

  return (
    <ActionIcon
      {...getButtonProps({ isActive: isMathInline })}
      onClick={handleMathClick}
      title={isMathInline ? "Delete Inline Math" : "Create Inline Math"}
    >
      <FunctionIcon weight="bold" />
    </ActionIcon>
  );
}

export function MathBlockButton({ editor }: OptionProps) {
  if (!editor) {
    return null;
  }

  const isMathBlock = !!editor.isActive("math-display");

  const handleMathClick = () => {
    if (isMathBlock) {
      // If inside a math block, delete it.
      editor.chain().focus().deleteBlockMath().run();
    } else {
      // Use the selected text for the new math block.
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to);

      // This command replaces the current selection with a math block.
      editor
        .chain()
        .focus()
        .deleteSelection()
        .insertBlockMath({ latex: selectedText })
        .run();
    }
  };

  return (
    <ActionIcon
      {...getButtonProps({ isActive: isMathBlock })}
      onClick={handleMathClick}
      title={isMathBlock ? "Delete Math Block" : "Create Math Block"}
    >
      <MathOperationsIcon weight="bold" />
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
            {...getButtonProps({ isActive: false })}
            title="Extra"
            onClick={() => setOpened(!opened)}
          >
            {opened ? (
              <XIcon weight="bold" />
            ) : (
              <DotsThreeVerticalIcon weight="bold" />
            )}
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
  const [href, setHREF] = useState(
    () => editor?.getAttributes("link").href || "",
  );

  const isLink = !!editor?.isActive("link");

  useEffect(() => {
    if (isLink && editor) {
      const currentHref = editor.getAttributes("link").href;
      setHREF(currentHref);
    }
  }, [isLink, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;

    if (href === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setPopoverOpened(false);
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();

    setPopoverOpened(false);
  }, [editor, href]);

  const handleButtonClick = () => {
    if (!editor) return;

    if (isLink) {
      editor.chain().focus().unsetLink().run();
      setHREF("");
    } else {
      setPopoverOpened((o) => !o);
    }
  };

  const handleClosePopover = () => {
    setPopoverOpened(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      setLink();
    }
  };

  return (
    <Popover
      opened={popoverOpened}
      onClose={handleClosePopover}
      position="bottom"
      withArrow
      shadow="md"
      trapFocus
    >
      <Popover.Target>
        <ActionIcon
          {...getButtonProps({ isActive: isLink })}
          onClick={handleButtonClick}
          title={isLink ? "Remove Link" : "Set Link"}
          disabled={!editor}
        >
          <LinkIcon weight="bold" />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Flex direction="column" gap="xs">
          <TextInput
            placeholder="Enter URL"
            type="url"
            value={href}
            onChange={(e) => setHREF(e.target.value)}
            onKeyDown={handleKeyDown}
            data-autofocus
          />
          <Group justify="right">
            <Button onClick={setLink} size="xs">
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
  const isActive = !!editor?.isActive("taskList");

  // This command works correctly on paragraphs, bullet lists,
  // ordered lists, and existing task lists.
  const toggleTaskList = () => {
    editor?.chain().focus().toggleTaskList().run();
  };

  const isDisabled = !editor;

  return (
    <ActionIcon
      {...getButtonProps({ isActive })}
      onClick={toggleTaskList}
      title="Toggle Task List"
      disabled={isDisabled}
    >
      <ListChecksIcon weight="bold" />
    </ActionIcon>
  );
}

export function TaskItemButton({ editor }: OptionProps) {
  const isActive = !!editor?.isActive("taskList");

  const toggleTask = () => {
    editor?.chain().focus().toggleTaskList().run();
  };

  const isDisabled = !editor;

  return (
    <ActionIcon
      {...getButtonProps({ isActive })}
      onClick={toggleTask}
      title="Toggle Task"
      disabled={isDisabled}
    >
      <CheckSquareIcon weight="bold" />
    </ActionIcon>
  );
}

export function OrderedListButton({ editor }: OptionProps) {
  const isActive = !!editor?.isActive("orderedList");

  const toggleOrderedList = () => {
    editor?.chain().focus().toggleOrderedList().run();
  };

  const isDisabled = !editor;

  return (
    <ActionIcon
      {...getButtonProps({ isActive })}
      onClick={toggleOrderedList}
      title="Toggle Ordered List"
      disabled={isDisabled}
    >
      <ListNumbersIcon weight="bold" />
    </ActionIcon>
  );
}

export function BulletListButton({ editor }: OptionProps) {
  const isActive = !!editor?.isActive("bulletList");

  // Function to toggle the bullet list format
  const toggleBulletList = () => {
    editor?.chain().focus().toggleBulletList().run();
  };

  // Disable button if the editor instance is not available
  const isDisabled = !editor;

  return (
    <ActionIcon
      {...getButtonProps({ isActive })}
      onClick={toggleBulletList}
      title="Toggle Bullet List"
      disabled={isDisabled}
    >
      <ListBulletsIcon weight="bold" /> {/* Icon for bullet list */}
    </ActionIcon>
  );
}

export function HeadingMenuButton({ editor }: OptionProps) {
  if (!editor) return null;

  const menuItems = [
    {
      name: "Paragraph",
      action: () => editor.chain().focus().setParagraph().run(),
      isActive: editor.isActive("paragraph"),
    },
    {
      name: "Heading 1",
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.isActive("heading", { level: 1 }),
    },
    {
      name: "Heading 2",
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive("heading", { level: 2 }),
    },
    {
      name: "Heading 3",
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.isActive("heading", { level: 3 }),
    },
  ];

  const currentlyActive = menuItems.find((item) => item.isActive);

  return (
    <Menu shadow="md" withArrow position="bottom-start">
      <Menu.Target>
        <Button
          size="xs"
          {...getButtonProps({ isActive: false })}
          title="Change style"
          rightSection={<CaretDownIcon weight="bold" />}
        >
          {currentlyActive?.name || "Text Styles"}
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Text Styles</Menu.Label>
        {menuItems.map((item) => (
          <Menu.Item
            key={item.name}
            onClick={item.action}
            rightSection={item.isActive ? <CheckIcon weight="bold" /> : null}
          >
            {item.name}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}

export function ListMenuButton({ editor }: OptionProps) {
  if (!editor) return null;

  const menuItems = [
    {
      name: "Bullets",
      icon: <ListBulletsIcon />,
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive("bulletList"),
    },
    {
      name: "Numbered",
      icon: <ListNumbersIcon />,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive("orderedList"),
    },
    {
      name: "Checkboxes",
      icon: <ListChecksIcon />,
      action: () => editor.chain().focus().toggleTaskList().run(),
      isActive: editor.isActive("taskList"),
    },
  ];

  const currentlyActive = menuItems.find((item) => item.isActive);

  return (
    <Menu shadow="md" withArrow position="bottom-start">
      <Menu.Target>
        <Button
          size="xs"
          {...getButtonProps({ isActive: false })}
          title="Change list type"
          rightSection={<CaretDownIcon weight="bold" />}
          leftSection={<ListIcon weight="bold" />}
        >
          {currentlyActive?.name || "List"}
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>List Types</Menu.Label>
        {menuItems.map((item) => (
          <Menu.Item
            key={item.name}
            leftSection={item.icon}
            onClick={item.action}
            rightSection={item.isActive ? <CheckIcon weight="bold" /> : null}
          >
            {item.name}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}

export function CodeMenuButton({ editor }: OptionProps) {
  if (!editor) return null;

  const menuItems = [
    {
      name: "Inline",
      icon: <CodeSimpleIcon weight="bold" />,
      action: () => editor.chain().focus().toggleCode().run(),
      isActive: editor.isActive("code"),
    },
    {
      name: "Block",
      icon: <CodeIcon weight="bold" />,
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: editor.isActive("codeBlock"),
    },
  ];

  const currentlyActive = menuItems.find((item) => item.isActive);

  return (
    <Menu shadow="md" withArrow position="bottom-start">
      <Menu.Target>
        <Button
          size="xs"
          {...getButtonProps({ isActive: false })}
          title="Code options"
          rightSection={<CaretDownIcon weight="bold" />}
          leftSection={<CodeSimpleIcon weight="bold" />}
        >
          {currentlyActive?.name || "Code"}
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Code Options</Menu.Label>
        {menuItems.map((item) => (
          <Menu.Item
            key={item.name}
            leftSection={item.icon}
            onClick={item.action}
            rightSection={item.isActive ? <CheckIcon weight="bold" /> : null}
          >
            {item.name}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}

/* MAGIC FEATURES */

export function NewIdea({ editor }: OptionProps) {
  const isIdea = !!editor?.isActive("dreamIdea");
  const [opened, { toggle, close }] = useDisclosure();
  const [loading, setLoading] = useState(false);

  const {
    actions: { newConnectedIdea },
  } = useInteraction();
  const {
    idea: {
      viewing: { get: viewingIdea },
    },
  } = useLandscape();
  const { includeThing, isDownRabbithole } = useRabbithole();

  const newIdeaForm = useForm({
    initialValues: { content: "" },
  });

  useEffect(() => {
    if (!opened) {
      newIdeaForm.reset();
      setLoading(false);
    }
  }, [opened]);

  const handleCreateNewIdea = async () => {
    if (newIdeaForm.validate().hasErrors) {
      return;
    }

    setLoading(true);
    try {
      const newIdea = await createIdea(newIdeaForm.values.content);

      if (newIdea) {
        editor
          ?.chain()
          .focus()
          .setDreamIdea({
            ideaId: newIdea.id.toString(),
            content: newIdea.title,
          })
          .run();

        if (isDownRabbithole) {
          includeThing(newIdea.id.toString());
        }
      }

      close();
    } catch (error) {
      console.error("Error creating new idea: ", error);
      showNotification({
        title: "Creation Error",
        message: "Failed to create the new idea.",
        color: "red",
      });
      setLoading(false);
    }
  };

  return (
    <Popover opened={opened} width={"400px"} radius="lg" withArrow>
      <Popover.Target>
        <ActionIcon
          {...getButtonProps({ isActive: isIdea })}
          onClick={toggle}
          loading={loading}
          title="Create a new idea"
        >
          <LightbulbIcon weight="bold" />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown style={{ overflowY: "scroll", maxHeight: "400px" }}>
        <Stack>
          <DreamWriter
            onChange={(v) => {
              newIdeaForm.setFieldValue("content", v);
            }}
          />
          <Group justify="flex-end">
            <ActionIcon onClick={close} variant="light" color="dark.1">
              <XIcon />
            </ActionIcon>
            <ActionIcon
              onClick={handleCreateNewIdea}
              variant="light"
              color="dark.1"
              disabled={!newIdeaForm.values.content}
              loading={loading}
            >
              <CheckIcon />
            </ActionIcon>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

export function ConnectIdea({ editor }: OptionProps) {
  const isIdea = !!editor?.isActive("dreamIdea");
  const [opened, { toggle, close }] = useDisclosure();
  const [loading, setLoading] = useState(false);

  const getSelection = () => {
    if (!editor) {
      showNotification({
        title: "Something went wrong",
        message: "Please try again later, or report this error",
        color: "red",
      });
      return;
    }
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);
    return selectedText;
  };

  const {
    idea: {
      viewing: { get: viewingIdea },
    },
  } = useLandscape();

  const {
    global: {
      results: { get: searchResults, set: setResults },
      query: { get: searchQuery, set: setQuery },
    },
  } = useSearch();

  useEffect(() => {
    const selectionText = getSelection();
    if (selectionText) {
      setQuery(selectionText);
      setResults(null);
    }
  }, [getSelection()]);

  const filteredResults = useMemo(() => {
    if (!searchResults) return null;
    return searchResults.filter((r) => {
      return r.id.toString() !== viewingIdea?.id.toString();
    });
  }, [searchResults, viewingIdea]);

  const clearResults = useCallback(() => {
    setQuery("");
  }, []);

  const handleConnectIdea = (idea: ISafeIdea) => {
    const selectedText = getSelection();
    editor
      ?.chain()
      .focus()
      .setDreamIdea({
        content: selectedText || idea.title,
        ideaId: idea.id.toString(),
      })
      .run();
    close();
    clearResults();
  };

  return (
    <Popover
      opened={opened}
      width={"400px"}
      radius="lg"
      withArrow
      closeOnClickOutside
      onClose={() => close()}
    >
      <Popover.Target>
        <ActionIcon
          {...getButtonProps({ isActive: isIdea })}
          onClick={toggle}
          loading={loading}
          title="Search and connect an idea"
        >
          <UniteSquareIcon weight="bold" />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown style={{ overflowY: "scroll", maxHeight: "400px" }}>
        <Stack>
          <Group justify="flex-end" wrap="nowrap">
            <SearchBar placeholder="Search for an idea to connect" />
            <ActionIcon onClick={close} variant="light" color="dark.1">
              <XIcon />
            </ActionIcon>
          </Group>
          <Stack>
            {filteredResults
              ?.map((s, i) => {
                const isBest = i === 0;
                const idea = getNodeAsIdeaOrNull(s.value);
                if (!idea) {
                  return null;
                }
                return (
                  <IdeaButton
                    key={s.id.toString()}
                    idea={idea}
                    onClick={(idea) => {
                      handleConnectIdea(idea);
                    }}
                  />
                );
              })
              .filter((r) => !!r)}
          </Stack>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

export function SpyglassButton({ editor }: OptionProps) {
  const getSelection = () => {
    if (!editor) {
      showNotification({
        title: "Something went wrong",
        message: "Please try again later, or report this error",
        color: "red",
      });
      return;
    }
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);
    return selectedText;
  };

  const navigate = useNavigate();

  const handleOpen = () => {
    navigate(`/spyglass?q=${getSelection()}`);
  };

  return (
    <ActionIcon {...getButtonProps({ isActive: false })} onClick={handleOpen}>
      <SpyglassIcon size={16} />
    </ActionIcon>
  );
}

export function TaskButton({ editor }: OptionProps) {
  const getSelection = () => {
    if (!editor) {
      showNotification({
        title: "Something went wrong",
        message: "Please try again later, or report this error",
        color: "red",
      });
      return;
    }
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);
    return selectedText;
  };

  const navigate = useNavigate();

  const {
    actions: { newTask },
  } = useInteraction();

  const handleOpen = () => {
    newTask(getSelection());
  };

  return (
    <ActionIcon {...getButtonProps({ isActive: false })} onClick={handleOpen}>
      <CheckIcon weight="bold" />
    </ActionIcon>
  );
}
