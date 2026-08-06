import { Loader, Text } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getFileTextContent } from "@infrastructure/api/userfiles";
import { isMarkdownMimeType } from "../../../../../../../shared/files/mimeTypes";
import { IFileViewerProps } from "..";
import styles from "./Text.module.scss";
import TextExcerptLayer from "../Excerpts/TextExcerptLayer";

const formatContent = (content: string, mimeType?: string) => {
  if (mimeType !== "application/json") return content;

  try {
    return JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    return content;
  }
};

export default function TextViewer({ fileId, file, source, withinSource }: IFileViewerProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    const loadText = async () => {
      if (withinSource && source?.content) {
        setContent(source.content);
        setLoading(false);
        return;
      }
      if (!fileId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setFailed(false);
      const text = await getFileTextContent(fileId.toString());
      if (!active) return;
      setContent(text || "");
      setFailed(text === undefined);
      setLoading(false);
    };

    void loadText();
    return () => {
      active = false;
    };
  }, [fileId, source?.content, withinSource]);

  const renderedContent = useMemo(
    () => formatContent(content, file?.mimeType),
    [content, file?.mimeType]
  );
  const isMarkdown = isMarkdownMimeType(file?.mimeType || "");
  const textContent = isMarkdown ? (
    <article className={styles.markdown}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ children, ...props }) => (
            <a {...props} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {renderedContent}
      </ReactMarkdown>
    </article>
  ) : (
    <pre className={styles.plainText}>{renderedContent}</pre>
  );

  return (
    <div className={styles.viewer}>
      <header className={styles.header}>
        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
          {isMarkdown ? "Rendered Markdown" : "Text preview"}
        </Text>
        <Text size="sm" fw={600} className={styles.fileName}>
          {file?.originalFileName || "Text file"}
        </Text>
      </header>

      <main className={styles.content}>
        {loading && <Loader size="sm" />}
        {!loading && failed && <Text c="dimmed">This file could not be loaded.</Text>}
        {!loading && !failed && !renderedContent && <Text c="dimmed">This file is empty.</Text>}
        {!loading && !failed && renderedContent && (
          <>
            {withinSource ? (
              <TextExcerptLayer contentKey={renderedContent}>{textContent}</TextExcerptLayer>
            ) : (
              textContent
            )}
          </>
        )}
      </main>
    </div>
  );
}
