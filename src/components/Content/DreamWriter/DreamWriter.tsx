import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
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
import { Group, Loader, Overlay, Text } from "@mantine/core";
import FloatingMenu from "./FloatingMenu";
import { getOS } from "../../../utils/platform";
import { useCollaboration } from "../../../hooks/useCollaboration";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import { useAuth } from "../../../contexts/AuthContext";
import { assignMantineColor } from "../../../utils/colors";
import { useLandscape } from "../../../contexts/LandscapeContext";
import { useDreamHealer } from "./hooks/useDreamHealer";

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
  collaborationId?: string;
  connectableId?: string;
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
      collaborationId,
      connectableId,
    },
    ref,
  ) => {
    const { user } = useAuth();
    const content = initialContent || defaultContent.trim();

    const { provider, status } = useCollaboration({
      roomId: collaborationId,
      enabled: !!collaborationId,
    });

    const userName = user?.firstName + " " + user?.lastName;

    const { extensions, loader } = useMemo(() => {
      const { extensions, loader } = getExtensionConfig({
        placeholder,
        connectableId,
      });

      if (provider) {
        extensions.push(
          Collaboration.configure({ document: provider.document }),
          CollaborationCaret.configure({
            provider,
            user: {
              name: userName,
              color: assignMantineColor(userName),
            },
          }),
        );
      }

      return {
        extensions,
        loader,
      };
    }, [provider, connectableId, placeholder]);

    const isLocked = !!collaborationId && status !== "synced";
    const isEditable = !isLocked && !readOnly;

    const editor = useEditor(
      {
        extensions,
        content: provider ? undefined : initialContent,
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
        onContentError: ({ disableCollaboration }) => {
          disableCollaboration();
        },
        onPaste: (e) => {},
        onCreate: (currentEditor) => {
          loader({ editor: currentEditor.editor });
          provider?.on("synced", () => {
            if (currentEditor.editor.isEmpty) {
              currentEditor.editor.commands.setContent(defaultContent);
            }
          });
        },
        editable: isEditable,
        injectCSS: false,
        autofocus,
      },
      [...(dependencies ?? []), initialContent, readOnly, content, provider],
    );

    useEffect(() => {
      if (!editor || !connectableId) return;

      const fileHandler = editor.extensionManager.extensions.find(
        (e) => e.name === "dreamFileHandler",
      );
      if (fileHandler) {
        fileHandler.options.connectableId = connectableId;
      }

      const connectionHandler = editor.extensionManager.extensions.find(
        (e) => e.name === "dreamConnection",
      );
      if (connectionHandler) {
        connectionHandler.options.connectableId = connectableId;
      }
    }, [editor, connectableId]);

    const [droppingOver, setDroppingOver] = useState(false);
    const editorContainerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => {
      if (editor) {
        return editor;
      }
      return undefined;
    }, [editor]);

    useEffect(() => {
      if (editor && initialContent && onContentReady) {
        const timeoutId = setTimeout(() => {
          onContentReady();
        }, 100);
        return () => clearTimeout(timeoutId);
      }
    }, [editor, initialContent, onContentReady]);

    useEffect(() => {
      if (editor) {
        editor.setEditable(isEditable);
      }
    }, [editor, isEditable]);

    const {
      actions: {
        layout: {
          spotlight: { open: openSpotlight },
        },
      },
    } = useInteraction();

    const os = getOS();
    const ctrl = os !== "macos";
    const meta = os === "macos";

    useShortcuts({
      shortcuts: [
        {
          keys: { ctrl, meta, key: "k" },
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

    const isContentReady = provider ? status === "synced" : true;
    useDreamHealer(editor, connectableId, isContentReady);

    return (
      <div
        ref={editorContainerRef}
        className={`${styles.editor} ${droppingOver ? styles.droppingOver : ""}`}
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
        {isLocked && (
          <div className={styles.syncing}>
            <Group gap="xs">
              <Text size="sm" c="dimmed" fw="bold">
                Syncing
              </Text>
              <Loader size="xs" color="gray" />
            </Group>
          </div>
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
        />
      </div>
    );
  },
);

export default DreamWriter;
