import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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
import Typography from "@tiptap/extension-typography";
import TaskList from "@tiptap/extension-task-list";
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
  FileIcon,
  MagicWandIcon,
  PlusIcon,
  TextAUnderlineIcon,
  TextIndentIcon,
  TextboxIcon,
} from "@phosphor-icons/react";
import useShortcuts from "../../../hooks/useShortcuts";
import { DreamImage } from "./nodes/DreamImage";
import { DreamFile } from "./nodes/DreamFile";
import { DreamFileHandler } from "./extensions/DreamFileHandler";
import { Group, Overlay, Text } from "@mantine/core";
import { DreamConnection } from "./extensions/DreamConnection";
import { DreamIdea } from "./nodes/DreamIdea";
import { DreamSlash } from "./extensions/DreamSlash";
import { Markdown } from "tiptap-markdown";
import { Indent } from "./extensions/Indent";
import { DreamTaskItem } from "./extensions/TaskItem";
import { DreamCode } from "./nodes/DreamCode";
import YouTube from "@tiptap/extension-youtube";
import { DreamMarkdown } from "./extensions/DreamMarkdown";

// import "highlight.js/styles/github-dark-dimmed.css";
import "./lib/qwest-highlight.scss";

import { all, createLowlight } from "lowlight";
import { useInteraction } from "../../../contexts/InteractionContext";
import { DreamTable } from "./nodes/DreamTable";

const lowlight = createLowlight(all);

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
  highlightText?: string; // Text to highlight when editor loads
  onChange?: (output: string) => void;
  onBlur?: (output: string) => void;
  onContentReady?: () => void;
  dependencies?: any[];
  readOnly?: boolean;
}

const defaultContent = ``;

const DreamWriter = forwardRef<IEditor | undefined, EditorProps>(
  (
    {
      initialContent,
      placeholder = "Start writing here...",
      outputType,
      stickyMenu,
      devTools,
      editorData,
      highlightText,
      onChange,
      onBlur,
      onContentReady,
      dependencies,
      readOnly,
    },
    ref,
  ) => {
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
          DreamCode.configure({
            lowlight,
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
          Dropcursor.configure({}),
          Typography.configure({}),
          TaskList.configure({
            HTMLAttributes: {
              class: contentStyles.taskList,
            },
          }),
          DreamTaskItem.configure({
            nested: true,
            HTMLAttributes: {
              class: contentStyles.taskItem,
            },
          }),
          // Markdown.configure({
          //   linkify: true,
          //   transformPastedText: true,
          //   html: true,
          //   bulletListMarker: "-",
          //   breaks: true,
          // }),
          DreamMarkdown.configure(),
          DreamTable.configure({
            HTMLAttributes: {
              class: contentStyles.table,
            },
          }),
          // TableRow.configure({
          //   HTMLAttributes: {
          //     class: contentStyles.tableRow,
          //   },
          // }),
          // TableHeader.configure({
          //   HTMLAttributes: {
          //     class: contentStyles.tableHeader,
          //   },
          // }),
          // TableCell.configure({
          //   HTMLAttributes: {
          //     class: contentStyles.tableCell,
          //   },
          // }),
          Indent.configure({
            types: [
              "paragraph",
              "heading",
              "blockquote",
              "list",
              "code",
              "table",
              "image",
              "file",
              "idea",
              "connection",
            ],
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
          YouTube.configure({
            HTMLAttributes: {
              class: contentStyles.youtube,
            },
          }),
          DreamSlash.configure({}),
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
        editable: !readOnly,
        injectCSS: false,
        autofocus: true,
      },
      [...(dependencies ?? []), initialContent],
    );

    const [droppingOver, setDroppingOver] = useState(false);
    const editorContainerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => {
      if (editor) {
        return editor;
      }
      return undefined;
    }, [editor]);

    // Call onContentReady when editor is ready and has content
    useEffect(() => {
      if (editor && initialContent && onContentReady) {
        // Small delay to ensure content is fully rendered in DOM
        const timeoutId = setTimeout(() => {
          onContentReady();
        }, 100);
        return () => clearTimeout(timeoutId);
      }
    }, [editor, initialContent, onContentReady]);

    const {
      actions: {
        layout: {
          spotlight: { open: openSpotlight },
        },
      },
    } = useInteraction();

    // useHotkeys([
    //   [
    //     "mod+k",
    //     () => {
    //       openSpotlight();
    //     },
    //   ],
    // ]);
    useShortcuts({
      shortcuts: [
        {
          keys: { ctrl: true, key: "k" },
          run: (e) => {
            e.preventDefault();
            openSpotlight();
          },
        },
        {
          keys: {
            key: "Tab",
          },
          run: (e) => {
            // e.preventDefault();
            // editor?.commands.insertContent("\t");
          },
        },
      ],
    });

    return (
      <div
        ref={editorContainerRef}
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
              <FileIcon />
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
  },
);

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
        <PlusIcon weight="regular" />
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
      icon: <TextAUnderlineIcon weight="regular" />,
      frame: BasicText,
      name: "Text editing",
    },
    {
      icon: <TextIndentIcon weight="regular" />,
      frame: BlockEditing,
      name: "Change block",
    },
    {
      icon: <TextboxIcon weight="regular" />,
      frame: FancyFeatures,
      name: "Add features",
    },
    {
      icon: <MagicWandIcon weight="regular" />,
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
