import React, { useCallback, useEffect, useRef, useState } from "react";
import { IIdea } from "../../../app/database/models/ideas";
import {
  ISearchResult,
  ISearchResultValue,
} from "../../../app/services/Search";
import useFetch from "../../hooks/useFetch";
import {
  Menu,
  TextInput,
  Loader,
  Text,
  Highlight,
  ActionIcon,
} from "@mantine/core";
import styles from "./SearchBar.module.scss";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import useShortcuts, { IShortcut } from "../../hooks/useShortcuts";
import { getNodeDescription, getNodeTitle } from "../../utils/graph";
import { useSearch } from "../../contexts/SearchContext";

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
};

export function SearchBar({
  placeholder = "Press / to search...",
  onResults,
  onResultsClear,
  onBlur,
  onSearchStart,
  onSearchEnd,
  onShortcuts,
  helpText = "Press enter to search...",
  omit,
}: ISearchBarProps) {
  const {
    query: { get: query, set: setQuery },
    results: { set: setResults },
  } = useSearch();

  const {
    data: rawResults,
    load: searchIdeas,
    loading: loadingIdeas,
  } = useFetch<{ query: string }, ISearchResult[]>({
    url: "/search/comprehensive",
    method: "POST",
    body: {
      query,
    },
    dependencies: [query],
    onBefore: () => {
      onSearchStart?.();
    },
    onSuccess: (r) => {
      onResults?.(r);
      setResults(r);
    },
    onFinally: () => {
      onSearchEnd?.();
    },
  });

  const results = rawResults?.filter(
    (result) => !omit?.includes(result.value.id.toString()),
  );

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

  const inputRef = useRef<HTMLInputElement>(null);

  const clearResults = useCallback(() => {
    setQuery("");
    onResultsClear?.();
  }, []);

  return (
    <div className={styles.searchBar}>
      <TextInput
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            searchIdeas();
          }
        }}
        leftSection={
          loadingIdeas ? (
            <Loader size="xs" />
          ) : (
            <MagnifyingGlass weight="bold" />
          )
        }
        rightSection={
          <ActionIcon
            variant="light"
            size="sm"
            color="gray"
            onClick={clearResults}
          >
            <X weight="bold" />
          </ActionIcon>
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
