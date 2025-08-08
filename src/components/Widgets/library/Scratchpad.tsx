import { useCallback, useEffect, useRef, useState } from "react";
import useFetch from "../../../hooks/useFetch";
import DreamWriter from "../../Content/DreamWriter/DreamWriter";
import { IWidgetConfig } from "../index.d";
import styles from "./Scratchpad.module.scss";
import {
  ActionIcon,
  CopyButton,
  Group,
  HoverCard,
  Menu,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  ArrowsClockwiseIcon,
  CheckIcon,
  CopySimpleIcon,
  CursorTextIcon,
  InfoIcon,
  MarkdownLogoIcon,
} from "@phosphor-icons/react";
import { Editor } from "@tiptap/core";
import { htmlToMarkdown, htmlToPlainText } from "../../../utils/formatting";

export default function Scratchpad() {
  const [content, setContent] = useState("");

  const {
    data: originalContent,
    load: loadContent,
    loading: loadingContent,
  } = useFetch<undefined, string>({
    url: "/users/me/scratchpad",
    onSuccess: (c) => {
      setContent(c);
    },
  });

  useEffect(() => {
    loadContent();
  }, []);

  const { load: postContent } = useFetch<{ content: string }, string>({
    url: "/users/me/scratchpad",
    method: "PUT",
    body: {
      content,
    },
    dependencies: [content],
  });

  const [typingTimeout, setTypingTimeout] = useState<Timer>();

  const handlePostContent = useCallback(async () => {
    if (content && !loadingContent) {
      postContent();
    }
  }, [content, loadingContent]);

  useEffect(() => {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    const timeout = setTimeout(() => {
      handlePostContent();
    }, 1000);
    setTypingTimeout(timeout);

    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [content]);

  const editorRef = useRef<Editor>(null);

  const handleClear = async () => {
    editorRef.current?.chain().clearContent(true).run();
  };

  const getMarkdownContent = () => {
    if (!content) {
      return "";
    }
    if (editorRef.current?.storage.markdown) {
      return editorRef.current?.storage.markdown.getMarkdown() as string;
    }
    return htmlToMarkdown(content);
  };

  return (
    <div className={styles.scratchpad}>
      <div className={styles.toolbar}>
        <Group>
          <HoverCard width="300px" radius="lg" openDelay={200}>
            <HoverCard.Target>
              <ActionIcon variant="light" radius="sm" size="sm" color="gray">
                <InfoIcon />
              </ActionIcon>
            </HoverCard.Target>
            <HoverCard.Dropdown>
              <Text size="sm">
                Scratchpad is a place to store content meant to be fleeting. Use
                it as a distraction pad, a place to jot down stuff you come
                across, or however you'd like! The suggestion is to clear it
                often, but use it however makes sense to you.
              </Text>
            </HoverCard.Dropdown>
          </HoverCard>
          <Tooltip label="Clear scratchpad">
            <ActionIcon
              variant="light"
              radius="sm"
              size="sm"
              color="gray"
              onClick={() => {
                handleClear();
              }}
            >
              <ArrowsClockwiseIcon />
            </ActionIcon>
          </Tooltip>
          <Menu trigger="hover" openDelay={200}>
            <Menu.Target>
              <ActionIcon variant="light" size="sm" color="gray">
                <CopySimpleIcon />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <CopyButton value={getMarkdownContent()}>
                {({ copied, copy }) => {
                  return (
                    <Menu.Item
                      leftSection={
                        copied ? <CheckIcon /> : <MarkdownLogoIcon />
                      }
                      onClick={copy}
                    >
                      Copy as Markdown
                    </Menu.Item>
                  );
                }}
              </CopyButton>
              {content && (
                <CopyButton value={htmlToPlainText(content)}>
                  {({ copied, copy }) => {
                    return (
                      <Menu.Item
                        leftSection={
                          copied ? <CheckIcon /> : <CursorTextIcon />
                        }
                        onClick={copy}
                      >
                        Copy as Text
                      </Menu.Item>
                    );
                  }}
                </CopyButton>
              )}
            </Menu.Dropdown>
          </Menu>
        </Group>
      </div>
      <div className={styles.editor}>
        <DreamWriter
          ref={editorRef}
          onBlur={() => {
            handlePostContent();
          }}
          onChange={(v) => {
            setContent(v);
          }}
          initialContent={originalContent}
          readOnly={loadingContent}
        />
      </div>
    </div>
  );
}

export const config: IWidgetConfig = {
  columns: {
    default: 8,
    min: 8,
    max: 12,
  },
};
