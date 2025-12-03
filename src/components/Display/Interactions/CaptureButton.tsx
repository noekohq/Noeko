import {
  CheckIcon,
  FileIcon,
  Icon,
  LightbulbIcon,
  NotePencilIcon,
  PlusIcon,
  RabbitIcon,
  XIcon,
} from "@phosphor-icons/react";
import styles from "./CaptureButton.module.scss";
import { useDisclosure } from "@mantine/hooks";
import { Loader, Text, Textarea } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { useInteraction } from "../../../contexts/InteractionContext";
import { createIdea } from "../../../utils/ideas";
import { markdownToHtml } from "../../../utils/formatting";
import { showNotification } from "@mantine/notifications";
import { createTask } from "../../../utils/tasks";
import useRabbithole from "../../../hooks/useRabbithole";

export default function CaptureButton() {
  const [opened, { toggle }] = useDisclosure();
  const [isCaptureFocused, setCaptureFocused] = useState(true);

  const {
    actions: {
      layout: {
        leftSidebar: { close: closeLeft },
        rightSidebar: { close: closeRight },
      },
      newSource,
      newRabbithole,
      newIdea,
      newTask,
    },
  } = useInteraction();

  const { isDownRabbithole, includeThing } = useRabbithole();

  const options: {
    label: string;
    action: () => void;
    icon: Icon;
  }[] = [
    {
      label: "Source",
      icon: FileIcon,
      action: () => {
        newSource();
        toggle();
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
            className={`${styles.menu} ${
              isCaptureFocused ? styles.focused : ""
            }`}
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
                  <button
                    className={styles.option}
                    key={option.label}
                    onClick={option.action}
                  >
                    <div className={styles.icon}>
                      <option.icon weight="bold" />
                    </div>
                    <div className={styles.label}>{option.label}</div>
                  </button>
                );
              })}
            </div>
            {isCaptureFocused && (
              <Text size="sm" c="dimmed" fw="bold" mb="xs">
                QUICK CAPTURE
              </Text>
            )}
            <div
              className={`${styles.quickCapture} ${isCaptureFocused ? styles.active : ""}`}
            >
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
                      !captureValue.length ||
                      loadingCapturedIdea ||
                      loadingCapturedTask
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
                      !captureValue.length ||
                      loadingCapturedIdea ||
                      loadingCapturedTask
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
          </div>
        </div>
      )}
      <button
        className={`${styles.capture} ${opened ? styles.opened : ""}`}
        onClick={() => {
          // if (window.navigator && window.navigator.vibrate) {
          //   window.navigator.vibrate(50);
          // }
          toggle();
        }}
      >
        <PlusIcon weight="bold" size={20} className={styles.icon} />
      </button>
    </>
  );
}
