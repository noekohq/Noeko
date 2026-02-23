import { forwardRef, useState, useRef, useCallback, useEffect } from "react";
import { Loader, ActionIcon, Textarea, Stack } from "@mantine/core";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import styles from "./SearchBar.module.scss";
import useShortcuts from '@core/hooks/useShortcuts';

const quips = [
  "Find that thing!",
  "Explore we shall!",
  "Adventure is out there!",
  "Into the great within!",
  "Where to next?",
  "Connect the dots...",
  "Ask a great question.",
  "Follow your curiosity!",
  "Summon the knowledge!",
  "Uncover a mystery",
  "Spark a new idea.",
  "What if...?",
  "A new quest awaits.",
  "Chart the unknown.",
  "Onward!",
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
                console.log("Submitting search from search bar");
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
