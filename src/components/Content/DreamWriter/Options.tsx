import styles from "./Options.module.scss";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Editor as IEditor } from "@tiptap/react";
import katex from "katex";
import {
  CaretDownIcon,
  CheckIcon,
  ClipboardTextIcon,
  CodeIcon,
  CodeSimpleIcon,
  CopyIcon,
  FunctionIcon,
  HighlighterIcon,
  LightbulbIcon,
  LinkIcon,
  ListBulletsIcon,
  ListChecksIcon,
  ListIcon,
  ListNumbersIcon,
  MagicWandIcon,
  MathOperationsIcon,
  ParagraphIcon,
  QuotesIcon,
  ScissorsIcon,
  SelectionAllIcon,
  SparkleIcon,
  TextBIcon,
  TextHOneIcon,
  TextHThreeIcon,
  TextHTwoIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  TextTIcon,
  TextUnderlineIcon,
  UniteSquareIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
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
import { SearchBar } from "../../Search/SearchBar";
import { useSearch } from "../../../contexts/SearchContext";
import { connect, getNodeAsIdeaOrNull } from "../../../utils/graph";
import IdeaButton from "../../Display/Ideas/Interactions/IdeaButton";
import { ISafeIdea } from "../../../../shared/types/idea";
import { useNavigate } from "react-router";
import { SpyglassIcon } from "../../Utils/Icons/Icons";
import useRabbithole from "../../../hooks/useRabbithole";
import { NodeSelection } from "@tiptap/pm/state";
import useConnectable from "../../../hooks/useConnectable";

interface OptionProps {
  editor: IEditor | null;
  visible: boolean;
}

interface IGetButtonPropsArgs {
  isActive: boolean;
}
const getButtonProps = ({ isActive }: IGetButtonPropsArgs) => ({
  className: `${styles.option} ${isActive ? styles.optionActive : ""}`,
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
          <button
            {...getButtonProps({ isActive: false })}
            onClick={copy}
            title="Copy"
            disabled={isDisabled}
          >
            {copied ? <CheckIcon weight="bold" /> : <CopyIcon weight="bold" />}
          </button>
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
    <button
      {...getButtonProps({ isActive: false })}
      onClick={handleCut}
      title="Cut"
      disabled={isDisabled}
    >
      <ScissorsIcon weight="bold" />
    </button>
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
    <button
      {...getButtonProps({ isActive: false })}
      onClick={handlePaste}
      title="Paste"
      disabled={!editor}
    >
      <ClipboardTextIcon weight="bold" />
    </button>
  );
}

export function SelectAllButton({ editor }: OptionProps) {
  const handleSelectAll = () => {
    editor?.chain().focus().selectAll().run();
  };

  return (
    <button
      {...getButtonProps({ isActive: false })}
      onClick={handleSelectAll}
      title="Select All"
      disabled={!editor}
    >
      <SelectionAllIcon weight="bold" />
    </button>
  );
}

export function BoldButton({ editor }: OptionProps) {
  const makeBold = () => editor?.chain().focus().toggleBold().run();

  const isBold = !!editor?.isActive("bold");

  return (
    <button
      {...getButtonProps({ isActive: isBold })}
      onClick={makeBold}
      title="Toggle Bold"
    >
      <TextBIcon weight="bold" />
    </button>
  );
}

export function ItalicButton({ editor }: OptionProps) {
  const makeItalic = () => editor?.chain().focus().toggleItalic().run();

  const isItalic = !!editor?.isActive("italic");

  return (
    <button
      {...getButtonProps({ isActive: isItalic })}
      onClick={makeItalic}
      title="Toggle Italic"
    >
      <TextItalicIcon weight="bold" />
    </button>
  );
}

export function StrikeThroughButton({ editor }: OptionProps) {
  const isStrike = !!editor?.isActive("strike");

  return (
    <button
      {...getButtonProps({ isActive: isStrike })}
      onClick={() => editor?.chain().focus().toggleStrike().run()}
      title="Toggle Strike Through"
    >
      <TextStrikethroughIcon weight="bold" />
    </button>
  );
}

export function HighlightButton({ editor }: OptionProps) {
  const isHighlighted = !!editor?.isActive("dreamHighlight");

  return (
    <button
      {...getButtonProps({ isActive: isHighlighted })}
      onClick={() => editor?.chain().focus().toggleDreamHighlight().run()}
      title="Toggle Strike Through"
    >
      <HighlighterIcon weight="bold" />
    </button>
  );
}

export function UnderlineButton({ editor }: OptionProps) {
  const makeUnderline = () => editor?.chain().focus().toggleUnderline().run();

  const isUnderline = !!editor?.isActive("underline");

  return (
    <button
      {...getButtonProps({ isActive: isUnderline })}
      onClick={makeUnderline}
      title="Toggle Underline"
    >
      <TextUnderlineIcon weight="bold" />
    </button>
  );
}

export function BlockquoteButton({ editor }: OptionProps) {
  const toggleBlockquote = () =>
    editor?.chain().focus().toggleBlockquote().run();

  const isActive = !!editor?.isActive("blockquote");

  return (
    <button
      {...getButtonProps({ isActive })}
      onClick={toggleBlockquote}
      title="Toggle Blockquote"
    >
      <QuotesIcon weight="bold" />
    </button>
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
        <button
          {...getButtonProps({ isActive: isLink })}
          onClick={handleButtonClick}
          title={isLink ? "Remove Link" : "Set Link"}
          disabled={!editor}
        >
          <LinkIcon weight="bold" />
        </button>
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

export function HeadingMenuButton({ editor }: OptionProps) {
  if (!editor) return null;

  const menuItems = [
    {
      name: "Paragraph",
      action: () => editor.chain().focus().setParagraph().run(),
      isActive: editor.isActive("paragraph"),
      icon: <ParagraphIcon weight="bold" />,
    },
    {
      name: "Heading 1",
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.isActive("heading", { level: 1 }),
      icon: <TextHOneIcon weight="bold" />,
    },
    {
      name: "Heading 2",
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive("heading", { level: 2 }),
      icon: <TextHTwoIcon weight="bold" />,
    },
    {
      name: "Heading 3",
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.isActive("heading", { level: 3 }),
      icon: <TextHThreeIcon weight="bold" />,
    },
  ];

  const currentlyActive = menuItems.find((item) => item.isActive);

  return (
    <Menu shadow="md" withArrow position="bottom-start">
      <Menu.Target>
        <button
          {...getButtonProps({ isActive: false })}
          className={`${styles.option} ${styles.menuButton}`}
          title={`Change ${currentlyActive?.name || "style"}`}
        >
          <span className={styles.menuButtonContent}>
            {currentlyActive?.icon || <TextTIcon />}
          </span>
          <CaretDownIcon weight="bold" className={styles.menuButtonCaret} />
        </button>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Text Styles</Menu.Label>
        {menuItems.map((item) => (
          <Menu.Item
            key={item.name}
            onClick={item.action}
            rightSection={item.isActive ? <CheckIcon weight="bold" /> : null}
            leftSection={item.icon}
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
        <button
          {...getButtonProps({ isActive: false })}
          className={`${styles.option} ${styles.menuButton}`}
          title="Change list type"
        >
          <span className={styles.menuButtonContent}>
            {currentlyActive?.icon || <ListIcon weight="bold" />}
          </span>
          <CaretDownIcon weight="bold" className={styles.menuButtonCaret} />
        </button>
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
        <button
          {...getButtonProps({ isActive: false })}
          className={`${styles.option} ${styles.menuButton}`}
          title="Code options"
        >
          <span className={styles.menuButtonContent}>
            {currentlyActive?.icon || <CodeSimpleIcon weight="bold" />}
          </span>
          <CaretDownIcon weight="bold" className={styles.menuButtonCaret} />
        </button>
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

export function MathMenuButton({ editor }: OptionProps) {
  if (!editor) return null;
  const isMathInline = !!editor.isActive("inlineMath");
  const isMathBlock = !!editor.isActive("blockMath");
  const handleMathInlineClick = () => {
    const selection = editor.state.selection as NodeSelection;
    if (isMathInline) {
      let replaceText = "";
      if ("node" in selection) {
        replaceText = selection.node.attrs.latex;
      }
      editor
        .chain()
        .focus()
        .deleteInlineMath()
        .insertContent(replaceText)
        .run();
    } else {
      try {
        const { from, to } = selection;
        const selectedText = editor.state.doc.textBetween(from, to);

        editor
          .chain()
          .focus()
          .deleteSelection()
          .insertInlineMath({ latex: selectedText })
          .run();
      } catch (error) {
        showNotification({
          title: "Something went wrong",
          message: "Invalid LaTeX expression",
          color: "red",
        });
      }
    }
  };
  const handleMathBlockClick = () => {
    const selection = editor.state.selection as NodeSelection;
    if (isMathBlock) {
      let replaceText = "";
      if ("node" in selection) {
        replaceText = selection.node.attrs.latex;
      }
      editor.chain().focus().deleteBlockMath().insertContent(replaceText).run();
    } else {
      try {
        const { from, to } = selection;
        const selectedText = editor.state.doc.textBetween(from, to);

        editor
          .chain()
          .focus()
          .deleteSelection()
          .insertBlockMath({ latex: selectedText })
          .run();
      } catch (error) {
        showNotification({
          title: "Something went wrong",
          message: "Invalid LaTeX expression",
          color: "red",
        });
      }
    }
  };

  const menuItems = [
    {
      name: "Inline",
      icon: <FunctionIcon weight="bold" />,
      action: () => handleMathInlineClick(),
      isActive: editor.isActive("inlineMath"),
    },
    {
      name: "Block",
      icon: <MathOperationsIcon weight="bold" />,
      action: handleMathBlockClick,
      isActive: editor.isActive("blockMath"),
    },
  ];

  const currentlyActive = menuItems.find((item) => item.isActive);

  return (
    <Menu shadow="md" withArrow position="bottom-start">
      <Menu.Target>
        <button
          {...getButtonProps({ isActive: false })}
          className={`${styles.option} ${styles.menuButton}`}
          title="Math options"
        >
          <span className={styles.menuButtonContent}>
            {currentlyActive?.icon || <MathOperationsIcon weight="bold" />}
          </span>
          <CaretDownIcon weight="bold" className={styles.menuButtonCaret} />
        </button>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Math Options</Menu.Label>
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
    connectable: {
      viewing: { get: viewingConnectable },
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

  const handleCreateNewIdea = async () => {
    if (newIdeaForm.validate().hasErrors) {
      return;
    }

    setLoading(true);
    try {
      const newIdea = await createIdea({
        content: newIdeaForm.values.content,
      });
      const selection = getSelection();

      if (newIdea) {
        editor
          ?.chain()
          .focus()
          .setDreamIdea({
            ideaId: newIdea.id.toString(),
            content: selection ?? newIdea.title,
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
        <button
          {...getButtonProps({ isActive: isIdea })}
          onClick={toggle}
          disabled={loading}
          title="Create a new idea"
        >
          <LightbulbIcon weight="bold" />
        </button>
      </Popover.Target>
      <Popover.Dropdown style={{ overflowY: "scroll", maxHeight: "400px" }}>
        <Stack>
          <DreamWriter
            onChange={(v) => {
              newIdeaForm.setFieldValue("content", v);
            }}
          />
          <Group justify="flex-end">
            <button onClick={close}>
              <XIcon />
            </button>
            <button
              onClick={handleCreateNewIdea}
              disabled={!newIdeaForm.values.content || loading}
            >
              <CheckIcon />
            </button>
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
    connectable: {
      viewing: { get: viewingIdea },
    },
  } = useLandscape();

  const {
    global: {
      results: { get: searchResults, set: setResults },
      query: { get: searchQuery, set: setQuery },
      loading: { get: searchLoading },
    },
  } = useSearch();

  useEffect(() => {
    const selectionText = getSelection();
    if (selectionText && opened) {
      setQuery(selectionText);
      setResults(null);
    }
  }, [getSelection(), opened]);

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

  useEffect(() => {
    return () => {
      close();
    };
  }, []);

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
        <button
          {...getButtonProps({ isActive: isIdea })}
          onClick={toggle}
          disabled={loading}
          title="Search and connect an idea"
        >
          <UniteSquareIcon weight="bold" />
        </button>
      </Popover.Target>
      <Popover.Dropdown style={{ overflowY: "scroll", maxHeight: "400px" }}>
        <Stack>
          <Group justify="flex-end" wrap="nowrap">
            <SearchBar
              placeholder="Search for an idea to connect"
              query={searchQuery}
              setQuery={setQuery}
              loading={searchLoading}
              onClear={clearResults}
            />
            <button onClick={close}>
              <XIcon />
            </button>
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
    <button {...getButtonProps({ isActive: false })} onClick={handleOpen}>
      <SpyglassIcon size={16} />
    </button>
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
    <button {...getButtonProps({ isActive: false })} onClick={handleOpen}>
      <CheckIcon weight="bold" />
    </button>
  );
}

export function MagicMenuButton({ editor, visible }: OptionProps) {
  const [opened, { toggle, close, open }] = useDisclosure();

  useEffect(() => {
    if (!visible) {
      close();
    }
  }, [visible]);

  if (!editor) return null;

  return (
    <Popover
      opened={opened}
      shadow="md"
      withArrow
      position="bottom-start"
      closeOnClickOutside={false}
    >
      <Popover.Target>
        <button
          {...getButtonProps({ isActive: opened })}
          title="Magic features"
          onClick={() => {
            toggle();
          }}
        >
          <MagicWandIcon weight="bold" />
        </button>
      </Popover.Target>
      <Popover.Dropdown>
        <Group gap="xs">
          <NewIdea visible={visible} editor={editor} />
          <ConnectIdea visible={visible} editor={editor} />
          <SpyglassButton visible={visible} editor={editor} />
          <TaskButton visible={visible} editor={editor} />
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
}
