import { forwardRef, useCallback, useEffect, useRef } from "react";
import { ISearchResult } from "../../../app/services/Search";
import useFetch from "../../hooks/useFetch";
import { Loader, ActionIcon, Textarea, Flex } from "@mantine/core";
import styles from "./SearchBar.module.scss";
import { MagnifyingGlass, MagnifyingGlassIcon, X } from "@phosphor-icons/react";
import useShortcuts, { IShortcut } from "../../hooks/useShortcuts";
import { useSearch } from "../../contexts/SearchContext";
import useRabbithole from "../../hooks/useRabbithole";

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

export const SearchBar = forwardRef<HTMLInputElement, ISearchBarProps>(
  (
    {
      placeholder = "Search your ideas...",
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
    } = useFetch<
      { query: string; rabbitholeId: string | undefined },
      { results: ISearchResult[] }
    >({
      url: "/search/comprehensive",
      method: "POST",
      body: {
        query,
        rabbitholeId: withinRabbithole
          ? currentRabbithole?.id.toString()
          : undefined,
      },
      dependencies: [query, withOverview],
      onBefore: () => {
        onSearchStart?.();
        setLoading(true);
      },
      onSuccess: (r) => {
        onResults?.(r.results);
        setResults(r.results);
      },
      onFinally: () => {
        onSearchEnd?.();
        setLoading(false);
      },
    });

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

    const inputRef = useRef<HTMLTextAreaElement>(null);

    const clearResults = useCallback(() => {
      setQuery("");
      onResultsClear?.();
    }, []);

    useEffect(() => {
      if (query === "") {
        clearResults();
      }
    }, [query]);

    return (
      <div className={styles.searchBar}>
        <Textarea
          minRows={1}
          maxRows={4}
          autosize
          radius={"md"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
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
                  <X weight="bold" />
                </ActionIcon>
              </Flex>
            ) : (
              <MagnifyingGlassIcon />
            )
          }
          ref={inputRef}
          onBlur={() => {
            onBlur && onBlur();
          }}
          onFocus={() => {}}
        />
      </div>
    );
  },
);
