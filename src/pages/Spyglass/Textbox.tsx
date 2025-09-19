import { ActionIcon, Button, Group, Text } from "@mantine/core";
import styles from "./Textbox.module.scss";
import {
  ArrowsClockwiseIcon,
  PaperPlaneIcon,
  PaperPlaneRightIcon,
  RabbitIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLayout } from "../../contexts/LayoutContext";
import useRabbithole from "../../hooks/useRabbithole";

interface ITextboxProps {
  onSubmit: (query: string) => void;
  onChange: (value: string) => void;
  onReset: () => void;
  value: string;
  placeholder?: string;
  placeholderIfInitialized?: string;
  initialized?: boolean;
}

export default function Textbox({
  onSubmit,
  onChange,
  onReset,
  value,
  placeholder,
  placeholderIfInitialized,
  initialized,
}: ITextboxProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [sendingAnimation, setSendingAnimation] = useState(false);

  const send = () => {
    setSendingAnimation(true);
    onSubmit(value);
    inputRef.current?.blur();
  };

  useEffect(() => {
    if (sendingAnimation) {
      setTimeout(() => setSendingAnimation(false), 1000);
    }
  }, [sendingAnimation]);

  const [isFocused, setIsFocused] = useState(false);

  useLayoutEffect(() => {
    if (!isFocused && !initialized) {
      inputRef.current?.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (inputRef.current && event.key === "/" && !isFocused) {
        event.preventDefault();
        inputRef.current.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [initialized, isFocused]);

  const showUI = () => {
    return true;
  };

  const { isDownRabbithole, currentRabbithole, exitRabbithole } =
    useRabbithole();

  return (
    <div
      className={`${styles.textbox} ${isFocused ? styles.focused : ""} ${initialized ? styles.initialized : ""}`}
      onClick={() => {
        if (!isFocused) {
          inputRef.current?.focus();
        }
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      <textarea
        placeholder={initialized ? placeholderIfInitialized : placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.currentTarget.value);
        }}
        ref={inputRef}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
          if (inputRef.current && e.key === "Escape") {
            if (isFocused) {
              inputRef.current.blur();
            }
          }
        }}
      />
      {showUI() && (
        <div className={styles.ui}>
          <Group justify="start">
            {isDownRabbithole && (
              <Button
                radius="xl"
                size="xs"
                variant="light"
                color="green"
                rightSection={
                  <>
                    <ActionIcon
                      variant="subtle"
                      onClick={(e) => {
                        e.stopPropagation();
                        exitRabbithole();
                      }}
                      size="sm"
                      color="green"
                    >
                      <XIcon weight="bold" />
                    </ActionIcon>
                  </>
                }
              >
                <Group gap="2px" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                  <RabbitIcon weight="fill" />
                  <Text
                    w={"100%"}
                    truncate={"end"}
                    size="xs"
                    tt="uppercase"
                    fw="bold"
                    title={currentRabbithole?.name}
                  >
                    {currentRabbithole?.name}
                  </Text>
                </Group>
              </Button>
            )}
          </Group>
          <Group justify="end">
            <ActionIcon
              onClick={() => {
                onReset();
              }}
              color="gray"
              size="md"
              variant="light"
              radius="md"
            >
              <ArrowsClockwiseIcon />
            </ActionIcon>
            <ActionIcon
              variant="light"
              radius="md"
              color="gray"
              onClick={(e) => {
                e.stopPropagation();
                send();
              }}
            >
              <PaperPlaneRightIcon />
            </ActionIcon>
          </Group>
        </div>
      )}
    </div>
  );
}
