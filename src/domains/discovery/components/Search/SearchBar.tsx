import { forwardRef, useState, useRef, useCallback, useEffect } from "react";
import { Loader, ActionIcon, Textarea, Stack } from "@mantine/core";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import styles from "./SearchBar.module.scss";
import useShortcuts from "@core/hooks/useShortcuts";
import { i18n } from "@lingui/core";
import { t } from "@lingui/core/macro";

const quips = [
  i18n._(t`Find that thing!`),
  i18n._(t`Explore we shall!`),
  i18n._(t`Adventure is out there!`),
  i18n._(t`Into the great within!`),
  i18n._(t`Where to next?`),
  i18n._(t`Connect the dots...`),
  i18n._(t`Ask a great question.`),
  i18n._(t`Follow your curiosity!`),
  i18n._(t`Summon the knowledge!`),
  i18n._(t`Uncover a mystery`),
  i18n._(t`Spark a new idea.`),
  i18n._(t`What if...?`),
  i18n._(t`A new quest awaits.`),
  i18n._(t`Chart the unknown.`),
  i18n._(t`Onward!`),
];

type ISearchBarProps = {
  query: string;
  setQuery: (q: string) => void;
  loading: boolean;
  onClear: () => void;
  placeholder?: string;
  withinRabbithole?: boolean;
  onSearchSubmit?: () => void;
  onShortcuts?: any;
};

export const SearchBar = forwardRef<HTMLTextAreaElement, ISearchBarProps>(
  ({ query, setQuery, loading, onClear, placeholder, withinRabbithole, onSearchSubmit }, ref) => {
    const [focused, setFocused] = useState(false);
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = ref || internalRef;

    const getRandomQuip = useCallback(() => {
      return quips[Math.floor(Math.random() * quips.length)];
    }, []);

    const [quip, setQuip] = useState(() => getRandomQuip());

    useEffect(() => {
      if (focused) {
        setQuip(getRandomQuip());
      }
    }, [focused, getRandomQuip]);

    useShortcuts({
      shortcuts: [
        {
          keys: {
            meta: true,
            key: "/",
          },
          run: (e) => {
            e.preventDefault();
            if (textareaRef && "current" in textareaRef && textareaRef.current) {
              textareaRef.current.focus();
            }
          },
        },
        {
          keys: {
            ctrl: true,
            key: "/",
          },
          run: (e) => {
            e.preventDefault();
            if (textareaRef && "current" in textareaRef && textareaRef.current) {
              textareaRef.current.focus();
            }
          },
        },
      ],
    });

    return (
      <Stack gap={"xs"}>
        {/* The Search Bar Container */}
        <div
          className={`${styles.searchContainer} ${
            focused ? styles.focused : ""
          } ${withinRabbithole ? styles.rabbithole : ""}`}
        >
          <div className={styles.leftSection}>
            <MagnifyingGlassIcon size={16} weight={focused ? "bold" : "regular"} />
          </div>

          <Textarea
            ref={textareaRef}
            variant="unstyled"
            className={styles.input}
            minRows={1}
            maxRows={4}
            autosize
            value={query || ""}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder || quip}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (!e.shiftKey && e.key === "Enter") {
                e.preventDefault();
                if (query) {
                  onSearchSubmit?.();
                }
              }
            }}
          />

          <div className={styles.rightSection}>
            {loading ? (
              <Loader size="xs" type="dots" />
            ) : query.length > 0 ? (
              <ActionIcon variant="subtle" color="gray" size="sm" onClick={onClear}>
                <XIcon />
              </ActionIcon>
            ) : null}
          </div>
        </div>
      </Stack>
    );
  }
);
