import React, { useEffect, useRef, useState } from "react";
import { IIdea, SearchResult } from "../../../app/database/models/ideas";
import useFetch from "../../hooks/useFetch";
import {
  Menu,
  TextInput,
  Loader,
  Text,
  Highlight,
  ActionIcon,
} from "@mantine/core";
import styles from "./InlineSearch.module.scss";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import useShortcuts, { IShortcut } from "../../hooks/useShortcuts";

type IInlineSearchProps = {
  placeholder?: string;
  onSelect: (idea: IIdea) => void;
  onResults?: (results: SearchResult[]) => void;
  onResultsClear?: () => void;
  onBlur?: () => void;
  onSearchStart?: () => void;
  onSearchEnd?: () => void;
  onShortcut?: IShortcut["keys"];
  onQueryChange?: (v: string) => void;
};

export function InlineSearch({
  placeholder = "Press / to search...",
  onSelect,
  onResults,
  onResultsClear,
  onBlur,
  onSearchStart,
  onSearchEnd,
  onShortcut,
  onQueryChange,
}: IInlineSearchProps) {
  const [query, setQuery] = useState("");

  const {
    data: results,
    load: searchIdeas,
    loading: loadingIdeas,
  } = useFetch<{ query: string }, SearchResult[]>({
    url: "/graph/ideas/search",
    method: "POST",
    body: {
      query,
    },
    dependencies: [query],
    onBefore: () => {
      onSearchStart?.();
    },
    onFinally: () => {
      onSearchEnd?.();
    },
  });

  useShortcuts({
    shortcuts: [
      {
        keys: { esc: true },
        run: () => {
          inputRef.current?.blur();
        },
      },
      ...(onShortcut
        ? [
            {
              keys: onShortcut,
              run: () => {
                inputRef.current?.focus();
              },
            },
          ]
        : []),
    ],
  });

  useEffect(() => {
    if (results) {
      onResults?.(results);
    }
  }, [results]);

  useEffect(() => {
    onQueryChange?.(query);
  }, [query]);

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

  const handleSelect = (result: SearchResult) => {
    onSelect(result.idea);
    setQuery("");
    setDropdownOpen(false);
  };

  const clearResults = () => {
    setQuery("");
    setDropdownOpen(false);
    onResultsClear?.();
  };

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
            onClick={() => setDropdownOpen(!dropdownOpen)}
          />
        </Menu.Target>
        <Menu.Dropdown
          style={{
            scrollbarWidth: "none",
          }}
        >
          {results ? (
            results.map((result) => {
              const isBestResult = result.idea.id === bestResult?.idea.id;

              return (
                <React.Fragment key={result.idea.id + "result"}>
                  <Menu.Item
                    onClick={() => {
                      handleSelect(result);
                    }}
                  >
                    <Text>{result.idea.title}</Text>
                    <Text size="xs" c="dimmed">
                      <Highlight component="span" highlight={query}>
                        {result.idea.derived?.generative_summary
                          ?.sentenceSummary || "No summary available"}
                      </Highlight>
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
