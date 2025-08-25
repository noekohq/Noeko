import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import "./DreamWriter.scss";
import styles from "./DreamWriter.module.scss";
import contentStyles from "./Content.module.scss";
import { useEditor, EditorContent, Editor as IEditor } from "@tiptap/react";
import { FileIcon } from "@phosphor-icons/react";
import useShortcuts from "../../../hooks/useShortcuts";
import { getExtensionConfig } from "./extensions";
import { useInteraction } from "../../../contexts/InteractionContext";
import BubbleMenu from "./BubbleMenu";
import { useLayout } from "../../../contexts/LayoutContext";
import { Group, Overlay, Text } from "@mantine/core";
import FloatingMenu from "./FloatingMenu";

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
  autofocus?: boolean;
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
      autofocus = true,
    },
    ref,
  ) => {
    const content = initialContent || defaultContent.trim();

    const { extensions, loader } = getExtensionConfig({ placeholder });

    const editor = useEditor(
      {
        extensions,
        content,
        editorProps: {
          attributes: {
            class: `${styles.tippyEditor} ${contentStyles.editor} tippy-editor`,
          },
        },
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
        onPaste: (e) => {},
        onCreate: (currentEditor) => {
          loader({ editor: currentEditor.editor });
        },
        editable: !readOnly,
        injectCSS: false,
        autofocus,
      },
      [...(dependencies ?? []), initialContent, readOnly, content],
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
          keys: { key: "Escape" },
          run: (e) => {
            e.preventDefault();
            editor?.commands?.blur();
          },
        },
      ],
    });

    const {
      isMobile,
      elements: {
        leftSidebar: {
          mode: { get: leftMode },
        },
      },
    } = useLayout();

    const [bubbleMenuVisible, setBubbleMenuVisible] = useState(false);

    return (
      <div
        ref={editorContainerRef}
        className={`${styles.editor} ${droppingOver ? styles.droppingOver : ""}`}
        // onDragOver={(e) => {
        //   e.preventDefault();
        // }}
        // onDragEnterCapture={(e) => {
        //   setDroppingOver(true);
        // }}
        // onDragLeaveCapture={(e) => {
        //   setDroppingOver(false);
        // }}
        // onDropCapture={(e) => {
        //   setDroppingOver(false);
        // }}
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
        {/*<FloatingMenu editor={editor} />*/}
        <BubbleMenu
          editor={editor}
          onVisibilityChange={(isVisible) => {
            setBubbleMenuVisible(isVisible);
          }}
          boundaryRef={editorContainerRef}
        />
        <EditorContent
          onContextMenuCapture={(e) => {
            if (isMobile && bubbleMenuVisible) {
              e.preventDefault();
            }
          }}
          className={styles.tippyContent}
          editor={editor}
          spellCheck={false}
        />
      </div>
    );
  },
);

export default DreamWriter;
