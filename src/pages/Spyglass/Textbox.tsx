import { Group } from "@mantine/core";
import styles from "./Textbox.module.scss";
import {
  ArrowsClockwiseIcon,
  PaperPlaneRightIcon,
} from "@phosphor-icons/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import PaperChip from "../../components/Display/Paper/PaperChip";
import PaperIcon from "../../components/Display/Paper/PaperIcon";
import ScopeBuilder, {
  IScope,
} from "../../components/Search/ScopeBuilder/ScopeBuilder";

interface ITextboxProps {
  onSubmit: (query: string) => void;
  onChange: (value: string) => void;
  onReset: () => void;
  value: string;
  placeholder?: string;
  initialized?: boolean;
  deepAnalysis: boolean;
  setDeepAnalysis: (value: boolean) => void;
  // New props for integrated scope
  scope: IScope;
  onScopeChange: (scope: IScope) => void;
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
  scope,
  onScopeChange,
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
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        inputRef.current &&
        event.metaKey &&
        event.key === "/" &&
        document.activeElement !== inputRef.current
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
    if (!isFocused && initialized) {
      return false;
    }
    return true;
  };

  // Check if any filters are active
  const hasActiveFilters = !!(
    scope.rabbithole ||
    scope.date ||
    (scope.tags?.set && scope.tags.set.length > 0)
  );

  return (
    <div
      className={`${styles.textbox} ${isFocused ? styles.focused : ""} ${initialized ? styles.initialized : ""}`}
      onClick={() => {
        if (!isFocused) {
          inputRef.current?.focus();
        }
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsFocused(false);
        }
      }}
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
          <div className={styles.uiLeft}>
            <Group gap="xs" wrap="wrap">
              {!initialized && (
                <ScopeBuilder value={scope} onChange={onScopeChange} />
              )}
            </Group>
          </div>
          <Group justify="end" gap="sm" className={styles.uiRight}>
            <PaperChip
              active={deepAnalysis}
              onClick={() => {
                setDeepAnalysis(!deepAnalysis);
              }}
            >
              Deep Focus
            </PaperChip>
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
