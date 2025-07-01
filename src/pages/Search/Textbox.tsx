import { ActionIcon, Group } from "@mantine/core";
import styles from "./Textbox.module.scss";
import { PaperPlaneIcon, PaperPlaneRightIcon } from "@phosphor-icons/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLayout } from "../../contexts/LayoutContext";

interface ITextboxProps {
  onSubmit: (query: string) => void;
  onChange?: (value: string) => void;
  defaultText?: string;
  placeholder?: string;
  placeholderIfInitialized?: string;
  initialized?: boolean;
}

export default function Textbox({
  onSubmit,
  onChange,
  defaultText,
  placeholder,
  placeholderIfInitialized,
  initialized,
}: ITextboxProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");
  const [sendingAnimation, setSendingAnimation] = useState(false);

  useEffect(() => {
    if (defaultText) {
      setValue(defaultText);
    }
  }, [defaultText]);

  const send = () => {
    setSendingAnimation(true);
    onSubmit(value);
    inputRef.current?.blur();
    setValue("");
  };

  useEffect(() => {
    if (sendingAnimation) {
      setTimeout(() => setSendingAnimation(false), 1000);
    }
  }, [sendingAnimation]);

  useEffect(() => {
    onChange?.(value);
  }, [value]);

  const [isFocused, setIsFocused] = useState(false);

  useLayoutEffect(() => {
    if (!isFocused && !initialized) {
      inputRef.current?.focus();
    }
    document.addEventListener("keydown", (event) => {
      if (inputRef.current && event.key === "/") {
        if (!isFocused) {
          event.preventDefault();
          inputRef.current.focus();
        }
      }
    });
  }, []);

  const showUI = () => {
    if (initialized && !isFocused) {
      return false;
    }
    return true;
  };

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
          setValue(e.currentTarget.value);
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
      )}
    </div>
  );
}
