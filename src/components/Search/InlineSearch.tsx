import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ISearchResult,
  ISearchResultValue,
} from "../../../app/services/Search";
import useFetch from "../../hooks/useFetch";
import { Menu, TextInput, Loader, Text, ActionIcon } from "@mantine/core";
import styles from "./InlineSearch.module.scss";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import useShortcuts, { IShortcut } from "../../hooks/useShortcuts";
import { getNodeDescription, getNodeTitle } from "../../utils/graph";
import { useSearch } from "../../contexts/SearchContext";

type IInlineSearchProps = {
  placeholder?: string;
  onSelect: (value: ISearchResultValue) => void;
  onResults?: (results: ISearchResult[]) => void;
  onResultsClear?: () => void;
  onBlur?: () => void;
  onSearchStart?: () => void;
  onSearchEnd?: () => void;
  onShortcuts?: IShortcut["keys"][];
  helpText?: string;
  omit?: string[];
};

export function InlineSearch({
  placeholder = "Press / to search...",
  onSelect,
  onResults,
  onResultsClear,
  onBlur,
  onSearchStart,
  onSearchEnd,
  onShortcuts,
  helpText = "Press enter to search...",
  omit,
}: IInlineSearchProps) {
  const {
    query: { get: query, set: setQuery },
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
          setDropdownOpen(false);
        },
      },
      ...(onShortcuts
        ? [
            ...onShortcuts.map((s) => {
              return {
                keys: s,
                run: () => {
                  inputRef.current?.focus();
                  setDropdownOpen(true);
                },
              };
            }),
          ]
        : []),
    ],
  });

  const inputRef = useRef<HTMLInputElement>(null);

  const resultsExist = results && results.length > 0;
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (resultsExist && !loadingIdeas && query.length > 0) {
      setDropdownOpen(true);
    } else {
      setDropdownOpen(false);
    }
  }, [resultsExist, loadingIdeas, query]);

  const bestResult = results && results[0];

  const handleSelect = useCallback((result: ISearchResult) => {
    onSelect(result.value);
    setQuery("");
    setDropdownOpen(false);
  }, []);

  const clearResults = useCallback(() => {
    setQuery("");
    setDropdownOpen(false);
    onResultsClear?.();
  }, []);

  useEffect(() => {
    if (query === "") {
      clearResults();
    }
  }, [query]);

  return (
    <div className={styles.inlineSearch}>
      <Menu
        shadow="md"
        width={"target"}
        opened={dropdownOpen}
        position="bottom-start"
        trapFocus={false}
        styles={{
          dropdown: {
            maxHeight: "25vh",
            overflowY: "scroll",
          },
        }}
        offset={24}
      >
        <Menu.Target>
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
              setDropdownOpen(false);
              onBlur && onBlur();
            }}
            onFocus={() => {
              setDropdownOpen(true);
            }}
          />
        </Menu.Target>
        <Menu.Dropdown
          style={{
            scrollbarWidth: "none",
          }}
        >
          <Text size="sm" c="dimmed" p="xs">
            {helpText}
          </Text>
          {results ? (
            results.map((result) => {
              const isBestResult = result.value.id === bestResult?.value.id;

              return (
                <React.Fragment key={result.value.id + "result"}>
                  <Menu.Item
                    onClick={() => {
                      handleSelect(result);
                    }}
                  >
                    <Text>{getNodeTitle(result.value)}</Text>
                    <Text size="xs" c="dimmed">
                      {result.highlightText ?? getNodeDescription(result.value)}
                    </Text>
                  </Menu.Item>
                  <Menu.Divider />
                </React.Fragment>
              );
            })
          ) : (
            <Text p="md" c="dimmed">
              No results found.
            </Text>
          )}
        </Menu.Dropdown>
      </Menu>
    </div>
  );
}
