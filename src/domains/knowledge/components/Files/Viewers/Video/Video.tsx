import { Loader, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import { getFileDownloadLink } from "@infrastructure/api/userfiles";
import { IFileViewerProps } from "..";
import styles from "./Video.module.scss";
import TextExcerptLayer from "../Excerpts/TextExcerptLayer";

export default function VideoViewer({
  fileId,
  file,
  source,
  withinSource = false,
}: IFileViewerProps) {
  const [fileUrl, setFileUrl] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    const loadVideo = async () => {
      if (!fileId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setFailed(false);
      const url = await getFileDownloadLink(fileId.toString());
      if (!active) return;
      setFileUrl(url);
      setFailed(!url);
      setLoading(false);
    };

    void loadVideo();
    return () => {
      active = false;
    };
  }, [fileId]);

  return (
    <div className={styles.viewer}>
      <section className={styles.stage}>
        {loading && <Loader size="sm" />}
        {!loading && failed && <Text c="dimmed">This video could not be loaded.</Text>}
        {!loading && fileUrl && (
          <video
            src={fileUrl}
            controls
            preload="metadata"
            aria-label={file?.originalFileName || "Uploaded video"}
            onError={() => setFailed(true)}
          >
            Your browser does not support video playback.
          </video>
        )}
      </section>

      {withinSource && source?.content && (
        <section className={styles.transcript}>
          <Text className={styles.eyebrow}>TRANSCRIPT</Text>
          <TextExcerptLayer contentKey={source.content}>
            <Text className={styles.transcriptContent}>{source.content}</Text>
          </TextExcerptLayer>
        </section>
      )}

      {!withinSource && !file?.source && (
        <Text className={styles.sourceHint} size="sm" c="dimmed">
          Convert this video to a source to transcribe its audio track.
        </Text>
      )}
    </div>
  );
}
