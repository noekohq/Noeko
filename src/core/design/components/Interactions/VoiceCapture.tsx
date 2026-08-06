import {
  ArrowCounterClockwiseIcon,
  FloppyDiskIcon,
  LockIcon,
  LockOpenIcon,
  MagicWandIcon,
  MicrophoneIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Loader } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { isAxiosError } from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { markdownToHtml } from "@core/utils/formatting";
import { createIdea } from "@domains/knowledge/utils/ideas";
import useRabbithole from "@domains/rabbitholes/hooks/useRabbithole";
import { linkFileToConnectable, uploadFileSmart } from "@infrastructure/api/userfiles";
import {
  processVoiceTranscript,
  transcribeVoiceRecording,
  VoiceProcessingMode,
} from "@infrastructure/api/voice";
import { IUserFile } from "../../../../../shared/types/userfile";
import styles from "./VoiceCapture.module.scss";

type VoiceCapturePhase =
  | "requesting"
  | "recording"
  | "paused"
  | "transcribing"
  | "ready"
  | "saving";

type VoiceCaptureProps = {
  holdActive: boolean;
  locked: boolean;
  startedFromHold: boolean;
  onLockChange: (locked: boolean) => void;
  onCancel: () => void;
  onSaved: () => void;
};

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<{ message?: string }>(error) && error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  return `${minutes.toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
};

const normalizeMimeType = (mimeType: string) => mimeType.split(";", 1)[0] || "audio/webm";

const extensionForMimeType = (mimeType: string) => {
  const normalized = normalizeMimeType(mimeType);
  if (normalized.includes("mp4") || normalized.includes("m4a")) return "m4a";
  if (normalized.includes("mpeg") || normalized.includes("mp3")) return "mp3";
  if (normalized.includes("ogg")) return "ogg";
  if (normalized.includes("wav")) return "wav";
  return "webm";
};

const supportedRecorderMimeType = () => {
  const candidates = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate));
};

const escapeAttribute = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const voiceFileNode = (file: IUserFile) =>
  `<div data-dream-file="" data-file-id="${escapeAttribute(file.id.toString())}" ` +
  `data-file-name="${escapeAttribute(file.originalFileName)}" ` +
  `data-file-type="${escapeAttribute(file.mimeType)}" data-view-mode="expanded"></div>`;

export default function VoiceCapture({
  holdActive,
  locked,
  startedFromHold,
  onLockChange,
  onCancel,
  onSaved,
}: VoiceCaptureProps) {
  const { isDownRabbithole, includeThing } = useRabbithole();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cancelledRef = useRef(false);
  const mountedRef = useRef(true);
  const startRequestedRef = useRef(false);

  const [phase, setPhase] = useState<VoiceCapturePhase>("requesting");
  const [duration, setDuration] = useState(0);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [processedTranscript, setProcessedTranscript] = useState("");
  const [processingMode, setProcessingMode] = useState<VoiceProcessingMode>("clean");
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");

  const stopMediaStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }, []);

  const transcribe = useCallback(async (file: File) => {
    setPhase("transcribing");
    setError("");
    try {
      const result = await transcribeVoiceRecording(file);
      if (!mountedRef.current) return;
      setTranscript(result.transcript);
      setPhase("ready");
    } catch (transcriptionError: unknown) {
      if (!mountedRef.current) return;
      setError(getErrorMessage(transcriptionError, "The recording could not be transcribed."));
      setPhase("ready");
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (startRequestedRef.current) return;
    startRequestedRef.current = true;
    setPhase("requesting");
    setError("");

    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("Voice recording is not supported by this browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      if (!mountedRef.current || cancelledRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      mediaStreamRef.current = stream;
      chunksRef.current = [];
      const mimeType = supportedRecorderMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        if (!mountedRef.current) return;
        setError("The browser stopped the recording unexpectedly.");
      };
      recorder.onstop = () => {
        stopMediaStream();
        if (cancelledRef.current || !mountedRef.current) return;
        const recordedMimeType = normalizeMimeType(recorder.mimeType || mimeType || "audio/webm");
        const blob = new Blob(chunksRef.current, { type: recordedMimeType });
        if (!blob.size) {
          setError("No audio was captured. Please try again.");
          setPhase("ready");
          return;
        }
        const file = new File(
          [blob],
          `voice-capture-${new Date().toISOString().replaceAll(/[:.]/g, "-")}.${extensionForMimeType(
            recordedMimeType
          )}`,
          { type: recordedMimeType }
        );
        const nextAudioUrl = URL.createObjectURL(file);
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = nextAudioUrl;
        setAudioFile(file);
        setAudioUrl(nextAudioUrl);
        void transcribe(file);
      };

      recorder.start(1000);
      setPhase("recording");
    } catch (recordingError: unknown) {
      startRequestedRef.current = false;
      setError(
        recordingError instanceof DOMException && recordingError.name === "NotAllowedError"
          ? "Microphone access was denied. Allow microphone access and try again."
          : getErrorMessage(recordingError, "The microphone could not be started.")
      );
      setPhase("ready");
    }
  }, [stopMediaStream, transcribe]);

  const finishRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, []);

  useEffect(() => {
    void startRecording();
    return () => {
      mountedRef.current = false;
      cancelledRef.current = true;
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      stopMediaStream();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, [startRecording, stopMediaStream]);

  useEffect(() => {
    if (phase !== "recording") return;
    const timer = window.setInterval(() => setDuration((current) => current + 1), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (
      startedFromHold &&
      !holdActive &&
      !locked &&
      (phase === "recording" || phase === "paused")
    ) {
      finishRecording();
    }
  }, [finishRecording, holdActive, locked, phase, startedFromHold]);

  const cancel = () => {
    cancelledRef.current = true;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    stopMediaStream();
    onCancel();
  };

  const pause = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === "recording") {
      recorder.pause();
      setPhase("paused");
    }
  };

  const resume = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === "paused") {
      recorder.resume();
      setPhase("recording");
    }
  };

  const retryRecording = () => {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    setAudioFile(null);
    setAudioUrl("");
    setTranscript("");
    setProcessedTranscript("");
    setDuration(0);
    setError("");
    startRequestedRef.current = false;
    cancelledRef.current = false;
    void startRecording();
  };

  const processTranscript = async () => {
    if (!transcript.trim()) return;
    setProcessing(true);
    setError("");
    try {
      setProcessedTranscript(await processVoiceTranscript(transcript, processingMode));
    } catch (processingError: unknown) {
      setError(getErrorMessage(processingError, "The transcript could not be processed."));
    } finally {
      setProcessing(false);
    }
  };

  const saveVoiceNote = async (content: string) => {
    if (!audioFile || !content.trim()) return;
    setPhase("saving");
    setError("");
    try {
      const uploadedFile = (await uploadFileSmart(
        audioFile,
        {
          onProgress: setUploadProgress,
          onError: (message) => setError(message),
        },
        { maxSizeBytes: MAX_AUDIO_BYTES }
      )) as IUserFile | undefined;
      if (!uploadedFile) throw new Error("The audio file could not be uploaded.");

      const idea = await createIdea({
        content: `${voiceFileNode(uploadedFile)}${markdownToHtml(content)}`,
        titleSource: content,
      });
      if (!idea) throw new Error("The voice note could not be created.");

      const linked = await linkFileToConnectable(uploadedFile.id.toString(), idea.id.toString());
      if (!linked) throw new Error("The recording could not be linked to the voice note.");
      if (isDownRabbithole) includeThing(idea.id.toString());

      showNotification({ message: "Your voice note was created successfully." });
      onSaved();
    } catch (saveError: unknown) {
      setError(getErrorMessage(saveError, "The voice note could not be saved."));
      setPhase("ready");
    }
  };

  const recording = phase === "recording" || phase === "paused";

  return (
    <div className={styles.voiceCapture}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>VOICE CAPTURE</div>
          <div className={styles.title}>
            {phase === "requesting" && "Starting microphone…"}
            {phase === "recording" && "Recording"}
            {phase === "paused" && "Recording paused"}
            {phase === "transcribing" && "Processing your voice…"}
            {phase === "ready" && (audioFile ? "Review voice note" : "Ready to retry")}
            {phase === "saving" && "Saving voice note…"}
          </div>
        </div>
        <button className={styles.iconButton} onClick={cancel} aria-label="Cancel voice capture">
          <XIcon weight="bold" />
        </button>
      </div>

      {(phase === "requesting" || recording) && (
        <div className={styles.recorder}>
          <div className={`${styles.recordingMark} ${phase === "paused" ? styles.paused : ""}`}>
            <span />
            <MicrophoneIcon weight="fill" />
          </div>
          <div className={styles.duration}>{formatDuration(duration)}</div>
          {startedFromHold && holdActive && !locked && (
            <div className={styles.holdHint}>Slide up to lock · release to finish</div>
          )}
          <div className={styles.recordingActions}>
            {startedFromHold && (
              <button
                className={styles.secondaryButton}
                onClick={() => onLockChange(!locked)}
                disabled={phase === "requesting"}
              >
                {locked ? <LockIcon weight="bold" /> : <LockOpenIcon weight="bold" />}
                {locked ? "Locked" : "Unlocked"}
              </button>
            )}
            {phase === "recording" && (
              <button className={styles.secondaryButton} onClick={pause}>
                <PauseIcon weight="fill" /> Pause
              </button>
            )}
            {phase === "paused" && (
              <button className={styles.secondaryButton} onClick={resume}>
                <PlayIcon weight="fill" /> Resume
              </button>
            )}
            <button
              className={styles.finishButton}
              onClick={finishRecording}
              disabled={phase === "requesting"}
            >
              <StopIcon weight="fill" /> Finish
            </button>
          </div>
        </div>
      )}

      {audioUrl && (
        <div className={styles.preview}>
          <audio src={audioUrl} controls preload="metadata" />
          <button
            className={styles.retryButton}
            onClick={retryRecording}
            disabled={phase === "saving"}
          >
            <ArrowCounterClockwiseIcon weight="bold" /> Record again
          </button>
        </div>
      )}

      {phase === "transcribing" && (
        <div className={styles.processingState}>
          <Loader size="sm" />
          Transcribing the completed recording
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {phase === "ready" && audioFile && !transcript && (
        <button className={styles.primaryButton} onClick={() => void transcribe(audioFile)}>
          Retry transcription
        </button>
      )}

      {transcript && phase !== "transcribing" && (
        <div className={styles.review}>
          <label htmlFor="voice-transcript">Transcript</label>
          <textarea
            id="voice-transcript"
            value={transcript}
            onChange={(event) => {
              setTranscript(event.currentTarget.value);
              setProcessedTranscript("");
            }}
            disabled={phase === "saving"}
          />

          {!processedTranscript && (
            <div className={styles.reviewActions}>
              <div className={styles.processControls}>
                <select
                  value={processingMode}
                  onChange={(event) =>
                    setProcessingMode(event.currentTarget.value as VoiceProcessingMode)
                  }
                  disabled={processing || phase === "saving"}
                  aria-label="Transcript processing mode"
                >
                  <option value="clean">Clean</option>
                  <option value="summarize">Summarize</option>
                  <option value="structure">Structure</option>
                </select>
                <button
                  className={styles.secondaryButton}
                  onClick={processTranscript}
                  disabled={processing || phase === "saving"}
                >
                  {processing ? <Loader size="xs" /> : <MagicWandIcon weight="bold" />}
                  Process
                </button>
              </div>
              <button
                className={styles.primaryButton}
                onClick={() => void saveVoiceNote(transcript)}
                disabled={phase === "saving"}
              >
                {phase === "saving" ? <Loader size="xs" /> : <FloppyDiskIcon weight="bold" />}
                {phase === "saving" && uploadProgress
                  ? `Uploading ${uploadProgress}%`
                  : "Save voice note"}
              </button>
            </div>
          )}

          {processedTranscript && (
            <div className={styles.processed}>
              <div className={styles.processedLabel}>Processed transcript</div>
              <div className={styles.processedText}>{processedTranscript}</div>
              <div className={styles.reviewActions}>
                <button
                  className={styles.secondaryButton}
                  onClick={() => void saveVoiceNote(transcript)}
                  disabled={phase === "saving"}
                >
                  Nevermind · use original
                </button>
                <button
                  className={styles.primaryButton}
                  onClick={() => void saveVoiceNote(processedTranscript)}
                  disabled={phase === "saving"}
                >
                  {phase === "saving" ? <Loader size="xs" /> : <FloppyDiskIcon weight="bold" />}
                  Complete
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
