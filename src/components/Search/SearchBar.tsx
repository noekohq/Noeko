import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import {
  IConnectableSearchQuery,
  ISearchResult,
} from "../../../app/services/Search";
import useFetch from "../../hooks/useFetch";
import { Loader, ActionIcon, Textarea, Flex, List, Text } from "@mantine/core";
import styles from "./SearchBar.module.scss";
import {
  MagnifyingGlass,
  MagnifyingGlassIcon,
  X,
  XIcon,
} from "@phosphor-icons/react";
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
          : undefined,
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
      dependencies: [query, withOverview],
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

    const internalRef = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
      if (ref) {
        if (typeof ref === "function") {
          ref(internalRef.current);
        } else {
          ref.current = internalRef.current;
        }
      }
    }, [ref]);

    const isFocused = () => {
      const activeElement = document.activeElement;
      return activeElement === internalRef.current;
    };

    useShortcuts({
      shortcuts: [
        {
          keys: { key: "Escape" },
          run: () => {
            internalRef.current?.blur();
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

    const inputRef = useRef<HTMLTextAreaElement>(null);

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

    const tourRef = useTourStep({
      id: "feature:smart_search",
      title: "Smart Search",
      content: (
        <>
          <p>
            In Noeko, you can search for anything based on meaning, not just
            keywords.
          </p>
          <p>For example, queries like:</p>
          <List>
            <List.Item>“Gardening Concepts”</List.Item>
            <List.Item>“Driving laws in California”</List.Item>
            <List.Item>“That concept from biology class”</List.Item>
          </List>
          <p>
            Will bring up relevant results. No more searching for exact matches!
          </p>
        </>
      ),
      view: "all",
      order: 2,
    });

    return (
      <div className={styles.searchBar} ref={tourRef}>
        <Textarea
          minRows={1}
          maxRows={4}
          autosize
          radius={"md"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={focused ? getRandomQuip() : placeholder}
          classNames={{
            input: `${styles.input} ${withinRabbithole ? styles.withinRabbithole : ""}`,
          }}
          onKeyDown={(e) => {
            if (!e.shiftKey && e.key === "Enter") {
              e.preventDefault();
              searchIdeas();
            }
          }}
          rightSection={
            loadingIdeas ? (
              <Loader size="xs" />
            ) : query.length > 0 ? (
              <Flex direction="column" h="100%" justify="center">
                <ActionIcon
                  variant="light"
                  size="sm"
                  color="gray"
                  onClick={clearResults}
                >
                  <XIcon weight="bold" />
                </ActionIcon>
              </Flex>
            ) : (
              <MagnifyingGlassIcon />
            )
          }
          ref={inputRef}
          onBlur={() => {
            onBlur && onBlur();
            setFocused(false);
          }}
          onFocus={() => {
            setFocused(true);
          }}
        />
      </div>
    );
  },
);
