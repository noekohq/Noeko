import { useCallback, useEffect, useRef, useState } from "react";
import { ISearchOverview, ISearchResult } from "../../../app/services/Search";
import useFetch from "../../hooks/useFetch";
import { Loader, ActionIcon, Textarea, Flex } from "@mantine/core";
import styles from "./SearchBar.module.scss";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import useShortcuts, { IShortcut } from "../../hooks/useShortcuts";
import { useSearch } from "../../contexts/SearchContext";

type ISearchBarProps = {
  placeholder?: string;
  onResults?: (results: ISearchResult[], overview?: ISearchOverview) => void;
  onResultsClear?: () => void;
  onBlur?: () => void;
  onSearchStart?: () => void;
  onSearchEnd?: () => void;
  onShortcuts?: IShortcut["keys"][];
  helpText?: string;
  omit?: string[];
  withOverview?: boolean;
};

export function SearchBar({
  placeholder = "Search your ideas...",
  onResults,
  onResultsClear,
  onBlur,
  onSearchStart,
  onSearchEnd,
  onShortcuts,
  withOverview,
}: ISearchBarProps) {
  const {
    query: { get: query, set: setQuery },
    results: { set: setResults },
    loading: { set: setLoading },
  } = useSearch();

  const {
    data: rawResults,
    load: searchIdeas,
    loading: loadingIdeas,
  } = useFetch<
    { query: string; withOverview: boolean },
    { results: ISearchResult[]; overview: ISearchOverview }
  >({
    url: "/search/comprehensive",
    method: "POST",
    body: {
      query,
      withOverview: !!withOverview,
    },
    dependencies: [query, withOverview],
    onBefore: () => {
      onSearchStart?.();
      setLoading(true);
    },
    onSuccess: (r) => {
      onResults?.(r.results, r.overview);
      setResults(r.results);
    },
    onFinally: () => {
      onSearchEnd?.();
      setLoading(false);
    },
  });

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
                run: () => {
                  inputRef.current?.focus();
                },
              };
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
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        styles={{
          input: {
            scrollbarWidth: "none",
          },
        }}
        onKeyDown={(e) => {
          if (!e.shiftKey && e.key === "Enter") {
            e.preventDefault();
            searchIdeas();
          }
        }}
        leftSection={
          <Flex direction="column" h="100%" pt="xs">
            {loadingIdeas ? (
              <Loader size="xs" />
            ) : (
              <MagnifyingGlass weight="bold" />
            )}
          </Flex>
        }
        rightSection={
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
        }
        ref={inputRef}
        onBlur={() => {
          onBlur && onBlur();
        }}
        onFocus={() => {}}
      />
    </div>
  );
}
