import { ActionIcon, Button, Chip, Group, Text } from "@mantine/core";
import styles from "./Textbox.module.scss";
import {
  ArrowsClockwiseIcon,
  PaperPlaneRightIcon,
  RabbitIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import useRabbithole from "../../hooks/useRabbithole";
import PaperButton from "../../components/Display/Paper/PaperButton";
import PaperChip from "../../components/Display/Paper/PaperChip";
import PaperIcon from "../../components/Display/Paper/PaperIcon";

interface ITextboxProps {
  onSubmit: (query: string) => void;
  onChange: (value: string) => void;
  onReset: () => void;
  value: string;
  placeholder?: string;
  initialized?: boolean;
  deepAnalysis: boolean;
  setDeepAnalysis: (value: boolean) => void;
}

export default function Textbox({
  onSubmit,
  onChange,
  onReset,
  value,
  placeholder,
  initialized,
  deepAnalysis,
  setDeepAnalysis,
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
      if (
        inputRef.current &&
        event.metaKey &&
        event.key === "/" &&
        !isFocused
      ) {
        event.preventDefault();
        inputRef.current.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const showUI = () => {
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
        placeholder={placeholder}
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
            <PaperChip
              active={deepAnalysis}
              onClick={() => {
                setDeepAnalysis(!deepAnalysis);
              }}
            >
              Deep Focus
            </PaperChip>
          </Group>
          <Group justify="end" gap="sm">
            {initialized && (
              <PaperIcon
                aria-label="Reset Spyglass"
                onClick={() => {
                  onReset();
                }}
              >
                <ArrowsClockwiseIcon />
              </PaperIcon>
            )}
            <PaperIcon
              aria-label="Submit query"
              onClick={(e) => {
                e.stopPropagation();
                send();
              }}
              withBorder
            >
              <PaperPlaneRightIcon />
            </PaperIcon>
          </Group>
        </div>
      )}
    </div>
  );
}
