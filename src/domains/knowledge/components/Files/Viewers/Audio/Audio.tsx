import { Loader, Text } from "@mantine/core";
import { MicrophoneStageIcon } from "@phosphor-icons/react";
import { RecordId } from "surrealdb";
import { useEffect, useState } from "react";
import { getFileDownloadLink } from "@infrastructure/api/userfiles";
import { IUserFile } from "../../../../../../../shared/types/userfile";
import { ISource } from "../../../../../../../shared/types/source";
import styles from "./Audio.module.scss";
import TextExcerptLayer from "../Excerpts/TextExcerptLayer";

interface IAudioViewerProps {
  fileId: string | RecordId | undefined;
  file?: IUserFile;
  source?: ISource;
  withinSource?: boolean;
}

export default function AudioViewer({
  fileId,
  file,
  source,
  withinSource = false,
}: IAudioViewerProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const repairWebmDuration = (audio: HTMLAudioElement) => {
    if (audio.duration !== Infinity) return;

    audio.currentTime = Number.MAX_SAFE_INTEGER;
    audio.ontimeupdate = () => {
      audio.ontimeupdate = null;
      audio.currentTime = 0;
    };
  };

  useEffect(() => {
    let active = true;

    if (!fileId) {
      setFileUrl(null);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    const loadAudio = async () => {
      setLoading(true);
      setFailed(false);
      const url = await getFileDownloadLink(fileId.toString());
      if (!active) return;
      setFileUrl(url || null);
      setFailed(!url);
      setLoading(false);
    };

    void loadAudio();
    return () => {
      active = false;
    };
  }, [fileId]);

  return (
    <div className={styles.audioViewer}>
      <section className={styles.playerStage}>
        <div className={styles.artwork}>
          <span className={styles.pulse} />
          <MicrophoneStageIcon weight="duotone" />
        </div>
        <div className={styles.fileIdentity}>
          <Text className={styles.eyebrow}>VOICE RECORDING</Text>
          <Text className={styles.title}>{file?.originalFileName || "Audio recording"}</Text>
        </div>

        {loading && <Loader size="sm" />}
        {!loading && failed && (
          <Text c="dimmed" size="sm">
            This recording could not be loaded.
          </Text>
        )}
        {!loading && fileUrl && (
          <audio
            className={styles.audio}
            src={fileUrl}
            controls
            preload="metadata"
            onLoadedMetadata={(event) => repairWebmDuration(event.currentTarget)}
          >
            Your browser does not support audio playback.
          </audio>
        )}
      </section>

      {withinSource && source?.content && (
        <section className={styles.transcript}>
          <div>
            <Text className={styles.eyebrow}>TRANSCRIPT</Text>
            <Text fw={600}>What was captured</Text>
          </div>
          <TextExcerptLayer contentKey={source.content}>
            <Text className={styles.transcriptContent}>{source.content}</Text>
          </TextExcerptLayer>
        </section>
      )}

      {!withinSource && !file?.source && (
        <Text className={styles.sourceHint} size="sm" c="dimmed">
          Convert this recording to a source to generate a transcript and unlock analysis.
        </Text>
      )}
    </div>
  );
}
