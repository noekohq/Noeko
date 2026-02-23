import {
  CheckIcon,
  FileIcon,
  // FileIcon,
  Icon,
  LightbulbIcon,
  NotePencilIcon,
  PlusIcon,
  RabbitIcon,
  XIcon,
} from "@phosphor-icons/react";
import styles from "./CaptureButton.module.scss";
import { useDisclosure } from "@mantine/hooks";
import { Badge, Group, Loader, MantineColor, Portal, Text } from "@mantine/core"; // Added Portal
import { useEffect, useRef, useState } from "react";
import { useInteraction } from '@/contexts/InteractionContext';
import { createIdea } from '@domains/knowledge/utils/ideas';
import { markdownToHtml } from '@core/utils/formatting';
import { showNotification } from "@mantine/notifications";
import { createTask } from '@domains/knowledge/utils/tasks';
import useRabbithole from '@domains/rabbitholes/hooks/useRabbithole';

export default function CaptureButton() {
  const [opened, { toggle }] = useDisclosure();
  const [isCaptureFocused, setCaptureFocused] = useState(true);

  const {
    actions: { newRabbithole, newIdea, newTask, newSource },
  } = useInteraction();

  const { isDownRabbithole, includeThing } = useRabbithole();

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
      label: "Task",
      icon: CheckIcon,
      action: () => {
        newTask();
        toggle();
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
    }
  }, [opened]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        toggle();
      }
    };

    if (opened) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [opened, toggle]);

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
      toggle();
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
      toggle();
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
              toggle();
            }}
          >
            <div
              className={`${styles.menu} ${isCaptureFocused ? styles.focused : ""}`}
              onClick={(e) => e.stopPropagation()}
            >
              {isCaptureFocused && (
                <Text size="sm" c="dimmed" fw="bold" mb="xs">
                  CREATE
                </Text>
              )}
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
              {isCaptureFocused && (
                <Text size="sm" c="dimmed" fw="bold" mb="xs">
                  QUICK CAPTURE
                </Text>
              )}
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
                      disabled={!captureValue.length || loadingCapturedIdea || loadingCapturedTask}
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
                      disabled={!captureValue.length || loadingCapturedIdea || loadingCapturedTask}
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
            </div>
          </div>
        )}
      </Portal>
      <button
        className={`${styles.capture} ${opened ? styles.opened : ""}`}
        onClick={() => {
          toggle();
        }}
      >
        <PlusIcon weight="bold" size={20} className={styles.icon} />
      </button>
    </>
  );
}
