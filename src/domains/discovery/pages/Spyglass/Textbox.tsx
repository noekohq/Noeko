import { Group } from "@mantine/core";
import styles from "./Textbox.module.scss";
import { ArrowsClockwiseIcon, PaperPlaneRightIcon } from "@phosphor-icons/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import PaperChip from "@core/design/components/Paper/PaperChip";
import PaperIcon from "@core/design/components/Paper/PaperIcon";
import { IGraphFilters } from "../../../../../shared/types/constellation";
import ScopeBuilder from "@domains/discovery/components/Search/ScopeBuilder/ScopeBuilder";

interface ITextboxProps {
  onSubmit: (query: string) => void;
  onChange: (value: string) => void;
  onReset: () => void;
  value: string;
  placeholder?: string;
  initialized?: boolean;
  deepAnalysis: boolean;
  setDeepAnalysis: (value: boolean) => void;
  scope: IGraphFilters;
  onScopeChange: (scope: IGraphFilters) => void;
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
  const { i18n } = useLingui();
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
              {!initialized && <ScopeBuilder />}
            </Group>
          </div>
          <Group justify="end" gap="sm" className={styles.uiRight}>
            <PaperChip
              active={deepAnalysis}
              onClick={() => {
                setDeepAnalysis(!deepAnalysis);
              }}
            >
              <Trans>Deep Focus</Trans>
            </PaperChip>
            {initialized && (
              <PaperIcon
                aria-label={i18n._(t`Reset Spyglass`)}
                onClick={() => {
                  onReset();
                }}
              >
                <ArrowsClockwiseIcon />
              </PaperIcon>
            )}
            <PaperIcon
              aria-label={i18n._(t`Submit query`)}
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
