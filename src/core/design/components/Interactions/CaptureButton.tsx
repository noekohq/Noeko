import {
  CheckIcon,
  FileIcon,
  // FileIcon,
  Icon,
  LightbulbIcon,
  MicrophoneIcon,
  NotePencilIcon,
  PlusIcon,
  RabbitIcon,
  XIcon,
} from "@phosphor-icons/react";
import styles from "./CaptureButton.module.scss";
import { useDisclosure } from "@mantine/hooks";
import { Badge, Loader, MantineColor, Portal, Text } from "@mantine/core"; // Added Portal
import { useCallback, useEffect, useRef, useState } from "react";
import { useInteraction } from "@/contexts/InteractionContext";
import { createIdea } from "@domains/knowledge/utils/ideas";
import { markdownToHtml } from "@core/utils/formatting";
import { showNotification } from "@mantine/notifications";
import { createTask } from "@domains/knowledge/utils/tasks";
import useRabbithole from "@domains/rabbitholes/hooks/useRabbithole";
import VoiceCapture from "./VoiceCapture";

const HOLD_DELAY_MS = 450;
const LOCK_SWIPE_DISTANCE_PX = 56;

export default function CaptureButton() {
  const [opened, { toggle, open, close }] = useDisclosure();
  const [isCaptureFocused, setCaptureFocused] = useState(true);
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceLocked, setVoiceLocked] = useState(false);
  const [voiceStartedFromHold, setVoiceStartedFromHold] = useState(false);
  const [captureHoldActive, setCaptureHoldActive] = useState(false);
  const holdTimerRef = useRef<number | null>(null);
  const holdTriggeredRef = useRef(false);
  const holdStartYRef = useRef(0);

  const {
    actions: { newRabbithole, newIdea, newTask, newSource },
  } = useInteraction();

  const { isDownRabbithole, includeThing } = useRabbithole();

  const openVoiceCapture = useCallback(
    (startedFromHold: boolean) => {
      setVoiceStartedFromHold(startedFromHold);
      setVoiceLocked(!startedFromHold);
      setVoiceMode(true);
      setCaptureFocused(true);
      open();
    },
    [open]
  );

  const closeCapture = useCallback(() => {
    setVoiceMode(false);
    setVoiceLocked(false);
    setVoiceStartedFromHold(false);
    setCaptureHoldActive(false);
    close();
  }, [close]);

  const options: {
    label: string;
    action: () => void;
    icon: Icon;
    tag?: {
      label: string;
      color: MantineColor;
    };
  }[] = [
    {
      label: "Voice Capture",
      icon: MicrophoneIcon,
      action: () => openVoiceCapture(false),
    },
    {
      label: "Source",
      icon: FileIcon,
      action: () => {
        newSource();
        toggle();
      },
      tag: {
        label: "EXPERIMENTAL",
        color: "orange.7",
      },
    },
    {
      label: "Rabbithole",
      icon: RabbitIcon,
      action: () => {
        newRabbithole();
        toggle();
      },
    },
    {
      label: "Quest",
      icon: CheckIcon,
      action: () => {
        newTask();
        toggle();
      },
      tag: {
        label: "EXPERIMENTAL",
        color: "orange.7",
      },
    },
    {
      label: "Idea",
      icon: LightbulbIcon,
      action: () => {
        newIdea();
        toggle();
      },
    },
  ];

  const captureRef = useRef<HTMLTextAreaElement>(null);
  const [captureValue, setCaptureValue] = useState("");

  const clearCapture = () => {
    setCaptureValue("");
    setCaptureFocused(false);
  };

  useEffect(() => {
    if (!opened) {
      clearCapture();
      setVoiceMode(false);
    }
  }, [opened]);

  useEffect(
    () => () => {
      if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
    },
    []
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeCapture();
      }
    };

    if (opened) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeCapture, opened]);

  const [loadingCapturedIdea, setLoadingCapturedIdea] = useState(false);
  const createCapturedIdea = async () => {
    try {
      setLoadingCapturedIdea(true);
      const idea = await createIdea({
        content: markdownToHtml(captureValue),
      });
      if (!idea) {
        throw new Error("Idea not recieved");
      }
      if (isDownRabbithole) {
        includeThing(idea.id.toString());
      }
      closeCapture();
      clearCapture();
      showNotification({
        message: "Your idea was created successfully.",
      });
    } catch (error) {
      console.error("Failed to create idea from capture", error);
      showNotification({
        message: "Failed to create idea",
        color: "red",
      });
    } finally {
      setLoadingCapturedIdea(false);
    }
  };

  const [loadingCapturedTask, setLoadingCapturedTask] = useState(false);
  const createCapturedTask = async () => {
    try {
      setLoadingCapturedTask(true);
      const task = await createTask({
        scratchpad: markdownToHtml(captureValue),
        auto: true,
      });
      if (!task) {
        throw new Error("Task not recieved");
      }
      if (isDownRabbithole) {
        includeThing(task.id.toString());
      }
      closeCapture();
      clearCapture();
      showNotification({
        message: "Your task was created successfully.",
      });
    } catch (error) {
      console.error("Failed to create task from capture", error);
      showNotification({
        message: "Failed to create task",
        color: "red",
      });
    } finally {
      setLoadingCapturedTask(false);
    }
  };

  return (
    <>
      <Portal>
        {opened && (
          <div
            className={styles.overlay}
            onClick={() => {
              setCaptureFocused(false);
              captureRef.current?.blur();
              closeCapture();
            }}
          >
            <div
              className={`${styles.menu} ${isCaptureFocused ? styles.focused : ""}`}
              onClick={(e) => e.stopPropagation()}
            >
              {!voiceMode && isCaptureFocused && (
                <Text size="sm" c="dimmed" fw="bold" mb="xs">
                  CREATE
                </Text>
              )}
              {!voiceMode && (
                <div className={styles.options}>
                  {options.map((option) => {
                    return (
                      <button className={styles.option} key={option.label} onClick={option.action}>
                        <div className={styles.icon}>
                          <option.icon weight="bold" />
                        </div>
                        <div className={styles.label}>
                          {option.label}
                          {option.tag && (
                            <Badge size="xs" variant="light" color={option.tag.color}>
                              {option.tag.label}
                            </Badge>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {!voiceMode && isCaptureFocused && (
                <Text size="sm" c="dimmed" fw="bold" mb="xs">
                  QUICK CAPTURE
                </Text>
              )}
              {!voiceMode && (
                <div className={`${styles.quickCapture} ${isCaptureFocused ? styles.active : ""}`}>
                  <div className={styles.input}>
                    <NotePencilIcon weight="bold" />
                    <textarea
                      disabled={loadingCapturedIdea}
                      onFocus={() => setCaptureFocused(true)}
                      onBlur={() => {
                        if (!captureValue.trim()) {
                          clearCapture();
                        }
                      }}
                      ref={captureRef}
                      value={captureValue}
                      onChange={(e) => setCaptureValue(e.target.value)}
                      className={`${styles.textarea} ${isCaptureFocused ? styles.focused : ""}`}
                      placeholder="Capture a thought..."
                    />
                  </div>
                  {isCaptureFocused && (
                    <div className={styles.quickCaptureActions}>
                      <button
                        className={styles.cancel}
                        onClick={() => {
                          clearCapture();
                        }}
                      >
                        <XIcon weight="bold" />
                      </button>
                      <button
                        className={`${styles.path} ${styles.task}`}
                        disabled={
                          !captureValue.length || loadingCapturedIdea || loadingCapturedTask
                        }
                        onClick={() => {
                          createCapturedTask();
                        }}
                      >
                        {loadingCapturedTask ? (
                          <Loader size="xs" color="gray" />
                        ) : (
                          <CheckIcon weight="bold" />
                        )}
                        Task
                      </button>
                      <button
                        className={`${styles.path} ${styles.idea}`}
                        disabled={
                          !captureValue.length || loadingCapturedIdea || loadingCapturedTask
                        }
                        onClick={() => {
                          createCapturedIdea();
                        }}
                      >
                        {loadingCapturedIdea ? (
                          <Loader size="xs" color="gray" />
                        ) : (
                          <LightbulbIcon weight="bold" />
                        )}
                        Idea
                      </button>
                    </div>
                  )}
                </div>
              )}
              {voiceMode && (
                <VoiceCapture
                  holdActive={captureHoldActive}
                  locked={voiceLocked}
                  startedFromHold={voiceStartedFromHold}
                  onLockChange={setVoiceLocked}
                  onCancel={closeCapture}
                  onSaved={closeCapture}
                />
              )}
            </div>
          </div>
        )}
      </Portal>
      <button
        aria-label={opened ? "Close create menu" : "Create"}
        className={`${styles.capture} ${opened ? styles.opened : ""}`}
        onPointerDown={(event) => {
          if (opened || (event.pointerType === "mouse" && event.button !== 0)) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          holdStartYRef.current = event.clientY;
          holdTriggeredRef.current = false;
          setCaptureHoldActive(true);
          holdTimerRef.current = window.setTimeout(() => {
            holdTriggeredRef.current = true;
            openVoiceCapture(true);
          }, HOLD_DELAY_MS);
        }}
        onPointerMove={(event) => {
          if (
            holdTriggeredRef.current &&
            holdStartYRef.current - event.clientY >= LOCK_SWIPE_DISTANCE_PX
          ) {
            setVoiceLocked(true);
          }
        }}
        onPointerUp={(event) => {
          if (holdTimerRef.current !== null) {
            window.clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
          }
          setCaptureHoldActive(false);
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={() => {
          if (holdTimerRef.current !== null) {
            window.clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
          }
          setCaptureHoldActive(false);
        }}
        onContextMenu={(event) => {
          if (captureHoldActive) event.preventDefault();
        }}
        onClick={(event) => {
          if (holdTriggeredRef.current) {
            event.preventDefault();
            holdTriggeredRef.current = false;
            return;
          }
          if (opened) closeCapture();
          else toggle();
        }}
      >
        <PlusIcon weight="bold" size={20} className={styles.icon} />
      </button>
    </>
  );
}
