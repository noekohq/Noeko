import { Text } from "@mantine/core";
import { useState } from "react";
import { serverLocation } from "@infrastructure/api/client";
import { IFileViewerProps } from "..";
import styles from "./Image.module.scss";

export default function ImageViewer({ fileId, file }: IFileViewerProps) {
  const [failed, setFailed] = useState(false);
  const fileUrl = fileId ? `${serverLocation}/api/files/${fileId.toString()}/stream` : undefined;

  return (
    <div className={styles.viewer}>
      {failed && <Text c="dimmed">This image could not be loaded.</Text>}
      {!failed && fileUrl && (
        <img
          src={fileUrl}
          alt={file?.originalFileName || "Uploaded image"}
          onError={() => setFailed(true)}
        />
      )}
      {!fileUrl && <Text c="dimmed">No image is attached.</Text>}
    </div>
  );
}
