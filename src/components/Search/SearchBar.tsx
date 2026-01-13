import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import {
  IConnectableSearchQuery,
  ISearchResult,
} from "../../../app/services/Search";
import useFetch from "../../hooks/useFetch";
import { Loader, ActionIcon, Textarea } from "@mantine/core";
import styles from "./SearchBar.module.scss";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import useShortcuts, { IShortcut } from "../../hooks/useShortcuts";
import { useSearch } from "../../contexts/SearchContext";
import useRabbithole from "../../hooks/useRabbithole";
import { useTourStep } from "../../contexts/TourGuideContext";

type ISearchBarProps = {
  placeholder?: string;
  onResults?: (results: ISearchResult[]) => void;
  onResultsClear?: () => void;
  onBlur?: () => void;
  onSearchStart?: () => void;
  onSearchEnd?: () => void;
  onShortcuts?: IShortcut["keys"][];
  helpText?: string;
  omit?: string[];
  withOverview?: boolean;
  ignoreRabbithole?: boolean;
};

export const SearchBar = forwardRef<HTMLTextAreaElement, ISearchBarProps>(
  (
    {
      placeholder = "Search anything...",
      onResults,
      onResultsClear,
      onBlur,
      onSearchStart,
      onSearchEnd,
      onShortcuts,
      withOverview,
      ignoreRabbithole,
    },
    ref,
  ) => {
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

    const getRandomQuip = () => {
      return quips[Math.floor(Math.random() * quips.length)];
    };

    const {
      global: {
        query: { get: query, set: setQuery },
        results: { set: setResults },
        loading: { set: setLoading },
        scope: { get: scope },
      },
    } = useSearch();

    const { currentRabbithole } = useRabbithole();
    const withinRabbithole = ignoreRabbithole ? false : !!currentRabbithole;

    const {
      data: rawResults,
      load: searchIdeas,
      loading: loadingIdeas,
    } = useFetch<IConnectableSearchQuery, ISearchResult[]>({
      url: "/search",
      method: "POST",
      body: {
        query,
        rabbithole: withinRabbithole
          ? currentRabbithole?.id.toString()
          : scope.rabbithole || undefined,
        tags: scope.tags,
        date: scope.date,
        tables: ["idea", "task", "source", "excerpt"],
        searchType: {
          fts: true,
          vector: true,
        },
        vectorSettings: {
          effort: "mid",
        },
        limit: 50,
      },
      dependencies: [query, withOverview, scope],
      onBefore: () => {
        onSearchStart?.();
        setLoading(true);
      },
      onSuccess: (r) => {
        onResults?.(r);
        setResults(r);
      },
      onFinally: () => {
        onSearchEnd?.();
        setLoading(false);
      },
    });

    const inputRef = useRef<HTMLTextAreaElement | null>(null);

    const setRefs = useCallback(
      (node: HTMLTextAreaElement) => {
        inputRef.current = node;
        if (ref) {
          if (typeof ref === "function") {
            ref(node);
          } else {
            ref.current = node;
          }
        }
      },
      [ref],
    );

    const isFocused = () => {
      const activeElement = document.activeElement;
      return activeElement === inputRef.current;
    };

    useShortcuts({
      shortcuts: [
        {
          keys: { key: "Escape" },
          run: () => {
            inputRef.current?.blur();
          },
        },
        ...(onShortcuts
          ? [
              ...onShortcuts.map((s) => {
                return {
                  keys: s,
                  run: (event) => {
                    if (!isFocused()) {
                      event.preventDefault();
                      inputRef.current?.focus();
                    }
                  },
                } as IShortcut;
              }),
            ]
          : []),
      ],
    });

    const clearResults = useCallback(() => {
      setQuery("");
      onResultsClear?.();
      setResults(null);
    }, []);

    useEffect(() => {
      if (query === "") {
        clearResults();
      }
    }, [query]);

    const [focused, setFocused] = useState(false);

    const [placeholderQuip, setPlaceholderQuip] = useState<string>();

    const tourRef = useTourStep({
      id: "feature:smart_search",

      title: "Smart Search",

      content: (
        <>
          In Noeko, you can search for anything based on meaning, not just
          keywords.
        </>
      ),

      view: "all",

      order: 4,
    });

    return (
      <div
        className={`${styles.searchBar} ${focused ? styles.focused : ""}`}
        ref={tourRef}
        onClick={() => inputRef.current?.focus()}
      >
        <Textarea
          minRows={1}
          maxRows={4}
          autosize
          radius={"md"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={focused ? placeholderQuip : placeholder}
          classNames={{
            wrapper: styles.wrapper,
            input: `${styles.input} ${
              withinRabbithole ? styles.withinRabbithole : ""
            } ${focused ? styles.focused : ""}`,
            section: `${styles.section}`,
          }}
          onKeyDown={(e) => {
            if (!e.shiftKey && e.key === "Enter") {
              e.preventDefault();

              searchIdeas();
            }
          }}
          ref={setRefs}
          onBlur={() => {
            onBlur && onBlur();

            setFocused(false);
          }}
          onFocus={() => {
            setFocused(true);

            setPlaceholderQuip(getRandomQuip());
          }}
        />
        <div className={styles.indicator}>
          {loadingIdeas ? (
            <Loader size="xs" />
          ) : query.length > 0 ? (
            <ActionIcon
              variant="light"
              size="sm"
              color="gray"
              onClick={clearResults}
            >
              <XIcon weight="bold" />
            </ActionIcon>
          ) : (
            <MagnifyingGlassIcon />
          )}
        </div>
      </div>
    );
  },
);
