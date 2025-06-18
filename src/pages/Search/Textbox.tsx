import { ActionIcon, Group } from "@mantine/core";
import styles from "./Textbox.module.scss";
import { PaperPlaneIcon, PaperPlaneRightIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

interface ITextboxProps {
  onSubmit: (query: string) => void;
  onChange?: (value: string) => void;
  placeholder?: string;
  initialized?: boolean;
}

export default function Textbox({
  onSubmit,
  onChange,
  placeholder,
  initialized,
}: ITextboxProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");
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

  useEffect(() => {
    onChange?.(value);
  }, [value]);

  const isFocused = () => {
    const activeElement = document.activeElement;
    return activeElement === inputRef.current;
  };

  useEffect(() => {
    document.addEventListener("keydown", (event) => {
      if (inputRef.current && event.key === "/") {
        if (!isFocused()) {
          event.preventDefault();
          inputRef.current.focus();
        }
      }
    });
  }, []);

  return (
    <div
      className={`${styles.textbox}`}
      onClick={() => {
        if (!isFocused()) {
          inputRef.current?.focus();
        }
      }}
    >
      <textarea
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.currentTarget.value);
        }}
        ref={inputRef}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
          if (inputRef.current && e.key === "Escape") {
            if (isFocused()) {
              inputRef.current.blur();
            }
          }
        }}
      />
      <div className={styles.ui}>
        <Group justify="end">
          <ActionIcon
            variant="subtle"
            onClick={(e) => {
              e.stopPropagation();
              send();
            }}
          >
            <PaperPlaneRightIcon />
          </ActionIcon>
        </Group>
      </div>
    </div>
  );
}
