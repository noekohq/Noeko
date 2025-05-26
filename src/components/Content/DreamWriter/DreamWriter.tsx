import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./DreamWriter.module.scss";
import contentStyles from "./Content.module.scss";
import {
  useEditor,
  EditorContent,
  FloatingMenu as TippyFloatingMenu,
  BubbleMenu as TippyBubbleMenu,
  Editor as IEditor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Dropcursor from "@tiptap/extension-dropcursor";
import CodeBlock from "@tiptap/extension-code-block";
import Typography from "@tiptap/extension-typography";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import {
  BlockquoteButton,
  BoldButton,
  CopyAsHTMLButton,
  HeadingButton,
  ItalicButton,
  LinkButton,
  ParagraphButton,
  UnderlineButton,
  CodeBlockButton,
  ExportAsHTMLButton,
  CodeInlineButton,
  StrikeThroughButton,
  ExtraButton,
  TaskListButton,
  TaskItemButton,
} from "./Options";
import {
  File,
  MagicWand,
  Plus,
  TextAUnderline,
  TextIndent,
  Textbox,
} from "@phosphor-icons/react";
import { useSettings } from "../../../contexts/SettingsContext";
import { useLink } from "./Utils";
import useShortcuts from "../../../hooks/useShortcuts";
import { DreamImage } from "./nodes/DreamImage";
import { DreamFile } from "./nodes/DreamFile";
import { DreamFileHandler } from "./extensions/DreamFileHandler";
import { Group, Overlay, Text } from "@mantine/core";
import { DreamConnection } from "./extensions/DreamConnection";
import { DreamIdea } from "./nodes/DreamIdea";
import { Markdown } from "tiptap-markdown";

interface EditorData {
  comments: [];
}

interface EditorProps {
  initialContent?: string;
  placeholder?: string;
  outputType?: "html" | "json";
  stickyMenu?: boolean;
  devTools?: boolean;
  editorData?: EditorData;
  onChange?: (output: string) => void;
  onBlur?: (output: string) => void;
  dependencies?: any[];
}

const defaultContent = ``;

function DreamWriter({
  initialContent,
  placeholder = "Start writing here...",
  outputType,
  stickyMenu,
  devTools,
  editorData,
  onChange,
  onBlur,
  dependencies,
}: EditorProps) {
  const content = initialContent || defaultContent.trim();

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3, 4, 5],
            HTMLAttributes: {
              class: contentStyles.heading,
            },
          },
          horizontalRule: {
            HTMLAttributes: {
              class: contentStyles.horizontalRule,
            },
          },
          blockquote: {
            HTMLAttributes: {
              class: contentStyles.blockquote,
            },
          },
          paragraph: {
            HTMLAttributes: {
              class: contentStyles.paragraph,
            },
          },
          listItem: {
            HTMLAttributes: {
              class: contentStyles.listItem,
            },
          },
          orderedList: {
            HTMLAttributes: {
              class: contentStyles.orderedList,
            },
          },
          bulletList: {
            HTMLAttributes: {
              class: contentStyles.bulletList,
            },
          },
          code: {
            HTMLAttributes: {
              class: contentStyles.code,
            },
          },
          strike: {
            HTMLAttributes: {
              class: contentStyles.strike,
            },
          },
          codeBlock: false,
          dropcursor: false,
        }),
        CodeBlock.configure({
          HTMLAttributes: {
            class: contentStyles.codeBlock,
          },
        }),
        Placeholder.configure({
          placeholder,
          emptyEditorClass: styles.emptyEditor,
          emptyNodeClass: styles.emptyNode,
        }),
        Underline.configure({
          HTMLAttributes: {
            class: contentStyles.underline,
          },
        }),
        Link.configure({
          HTMLAttributes: {
            class: contentStyles.link,
          },
        }),
        Dropcursor.configure({
          color: "var(--color-accent)",
        }),
        Typography.configure({}),
        TaskList.configure({
          HTMLAttributes: {
            class: contentStyles.taskList,
          },
        }),
        TaskItem.configure({
          nested: true,
          HTMLAttributes: {
            class: contentStyles.taskItem,
          },
        }),
        Markdown.configure({
          linkify: true,
          transformPastedText: true,
          html: true,
          bulletListMarker: "-",
          breaks: true,
        }),
        DreamImage.configure({
          HTMLAttributes: {
            class: contentStyles.image,
          },
        }),
        DreamFile.configure({
          HTMLAttributes: {
            class: contentStyles.file,
          },
        }),
        DreamIdea.configure({
          HTMLAttributes: {
            class: contentStyles.idea,
          },
        }),
        DreamFileHandler.configure({}),
        DreamConnection.configure({}),
      ],
      content,
      onUpdate: ({ editor: e }) => {
        if (onChange) {
          const output =
            outputType === "json" ? JSON.stringify(e.getJSON()) : e.getHTML();
          onChange(output);
        }
      },
      onBlur: ({ editor: e }) => {
        if (onBlur) {
          const output =
            outputType === "json" ? JSON.stringify(e.getJSON()) : e.getHTML();
          onBlur(output);
        }
      },
      editorProps: {
        attributes: {
          class: `${styles.tippyEditor} ${contentStyles.editor} tippy-editor`,
        },
      },
      onPaste: (e) => {},
      editable: true,
      injectCSS: false,
      autofocus: true,
    },
    [...(dependencies ?? []), initialContent],
  );

  const { toggleLink } = useLink({ editor });

  useShortcuts({
    shortcuts: [
      {
        keys: { meta: true, key: "k" },
        run: () => {
          toggleLink();
        },
      },
    ],
  });

  const [droppingOver, setDroppingOver] = useState(false);

  return (
    <div
      className={`${styles.editor} ${droppingOver ? styles.droppingOver : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDragEnterCapture={(e) => {
        setDroppingOver(true);
      }}
      onDragLeaveCapture={(e) => {
        setDroppingOver(false);
      }}
      onDropCapture={(e) => {
        setDroppingOver(false);
      }}
    >
      {droppingOver && (
        <Overlay
          backgroundOpacity={0.5}
          blur={5}
          onDragOver={(e) => {
            e.preventDefault();
          }}
          style={{
            pointerEvents: "none",
          }}
        >
          <Group align="center" justify="center" style={{ height: "100%" }}>
            <File />
            <Text fw="bold">Drop your file here</Text>
          </Group>
        </Overlay>
      )}
      <StickyMenu editor={editor} show={!!stickyMenu} devTools={devTools} />
      {/* <FloatingMenu editor={editor} /> */}
      <BubbleMenu editor={editor} />
      <EditorContent className={styles.tippyContent} editor={editor} />
    </div>
  );
}

export default DreamWriter;

function StickyMenu({
  editor,
  show,
  devTools,
}: {
  editor: IEditor | null;
  show: boolean;
  devTools?: boolean;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  const isMobile = window.innerWidth < 768;

  // check if it's in its fixed state on scroll
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const handleScroll = () => {
      const { top } = menu.getBoundingClientRect();
      const topLimitPx = window
        .getComputedStyle(document.documentElement)
        .getPropertyValue("--topnav-height");
      const navLimitPx = window
        .getComputedStyle(document.documentElement)
        .getPropertyValue("--navbar-height");

      const topLimit = topLimitPx.replace("px", "");
      const navLimit = isMobile ? navLimitPx.replace("px", "") : "0";

      if (top <= parseInt(topLimit) + parseInt(navLimit) + 14) {
        menu.classList.add(styles.stickyMenuFixed);
      } else {
        menu.classList.remove(styles.stickyMenuFixed);
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div
      className={`${styles.stickyMenu} ${!show ? styles.hidden : ""}`}
      ref={menuRef}
    >
      <BoldButton editor={editor} />
      <ItalicButton editor={editor} />
      <StrikeThroughButton editor={editor} />
      <UnderlineButton editor={editor} />
      <CodeInlineButton editor={editor} />
      <div className={styles.divider} />
      <ParagraphButton editor={editor} />
      <HeadingButton editor={editor} level={1} />
      <HeadingButton editor={editor} level={2} />
      <HeadingButton editor={editor} level={3} />
      <BlockquoteButton editor={editor} />
      <div className={styles.divider} />
      <LinkButton editor={editor} />
      <CodeBlockButton editor={editor} />
      <div className={styles.divider} />
      <ExtraButton editor={editor}>
        <CopyAsHTMLButton editor={editor} />
        <ExportAsHTMLButton editor={editor} />
      </ExtraButton>
    </div>
  );
}

function FloatingMenu({ editor }: { editor: IEditor | null }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <TippyFloatingMenu className={styles.floatingMenu} editor={editor}>
      {menuOpen && <div className={styles.menu}>Coming soon...</div>}
      <button
        className={`btn-subtle ${styles.menuButton} ${
          menuOpen ? styles.active : ""
        }`}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <Plus weight="regular" />
      </button>
    </TippyFloatingMenu>
  );
}

function BubbleMenu({ editor }: { editor: IEditor | null }) {
  const isImage = editor?.isActive("image");

  const hidden = isImage;

  const BasicText = (
    <>
      <BoldButton editor={editor} />
      <StrikeThroughButton editor={editor} />
      <ItalicButton editor={editor} />
      <UnderlineButton editor={editor} />
      <ParagraphButton editor={editor} />
      <CodeInlineButton editor={editor} />
      <TaskItemButton editor={editor} />
    </>
  );

  const BlockEditing = (
    <>
      <HeadingButton editor={editor} level={1} />
      <HeadingButton editor={editor} level={2} />
      <HeadingButton editor={editor} level={3} />
      <BlockquoteButton editor={editor} />
      <CodeBlockButton editor={editor} />
      <TaskListButton editor={editor} />
    </>
  );

  const FancyFeatures = (
    <>
      <LinkButton editor={editor} />
    </>
  );

  const GenerativeFeatures = <>Coming soon...</>;

  const frames: {
    name: string;
    icon: JSX.Element;
    frame: JSX.Element;
  }[] = [
    {
      icon: <TextAUnderline weight="regular" />,
      frame: BasicText,
      name: "Text editing",
    },
    {
      icon: <TextIndent weight="regular" />,
      frame: BlockEditing,
      name: "Change block",
    },
    {
      icon: <Textbox weight="regular" />,
      frame: FancyFeatures,
      name: "Add features",
    },
    {
      icon: <MagicWand weight="regular" />,
      frame: GenerativeFeatures,
      name: "Generate content",
    },
  ];
  const [currentFrame, setCurrentFrame] = useState(0);

  const FrameToRender = (
    <div className={styles.frame}>{frames[currentFrame].frame}</div>
  );

  return (
    <TippyBubbleMenu editor={editor} className={styles.bubbleMenu}>
      {!hidden && (
        <>
          <div className={styles.content}>
            <div className={styles.frameContainer}>{FrameToRender}</div>
          </div>
          <div className={styles.frameIndicator}>
            {frames.map((frame, index) => {
              return (
                <button
                  key={index}
                  className={`${styles.indicatorItem} ${
                    currentFrame === index ? styles.active : ""
                  }`}
                  onClick={() => setCurrentFrame(index)}
                  title={frame.name}
                  style={{
                    animationDelay: `${index * 0.05}s`,
                  }}
                >
                  {frame.icon}
                </button>
              );
            })}
          </div>
        </>
      )}
    </TippyBubbleMenu>
  );
}
