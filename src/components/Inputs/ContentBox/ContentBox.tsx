import { useState } from "react";
import TextEditor from "../../TextEditor/TextEditor";
import styles from "./ContentBox.module.scss";

export type IContentTypes = "text" | "video";

type IContentBoxProps = {
  content: string;
  type?: IContentTypes;
  onContentChange: (content: string) => void;
};

export default function ContentBox({
  content,
  type,
  onContentChange,
}: IContentBoxProps) {
  const [contentType, setContentType] = useState<IContentTypes>(type ?? "text");

  const typeToComponent: Record<IContentTypes, React.FC> = {
    text: () => <div className={styles.text}>{content}</div>,
    video: () => <div className={styles.video}>{content}</div>,
  };

  return <div className={styles.contentBox}>{content}</div>;
}

function YouTube() {}
