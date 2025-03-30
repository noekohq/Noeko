import { useEffect, useRef, useState } from "react";
import { IIdea, SearchResult } from "../../../app/database/models/idea";
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

type InlineSearchProps = {
  placeholder?: string;
  onSelect: (idea: IIdea) => void;
};

export function InlineSearch({
  placeholder = "Search ideas...",
  onSelect,
}: InlineSearchProps) {
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

  const handleSelect = (result: SearchResult) => {
    onSelect(result.idea);
    setQuery("");
    setDropdownOpen(false);
  };

  const clearResults = () => {
    setQuery("");
    setDropdownOpen(false);
  };

  return (
    <div className={styles.inlineSearch}>
      <Menu
        shadow="md"
        width={300}
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
            onBlur={() => setDropdownOpen(false)}
            onClick={() => setDropdownOpen(!dropdownOpen)}
          />
        </Menu.Target>
        <Menu.Dropdown>
          {results ? (
            results.map((result) => {
              const isBestResult = result.idea.id === bestResult?.idea.id;

              return (
                <>
                  <Menu.Item
                    key={result.idea.id}
                    onClick={() => {
                      handleSelect(result);
                    }}
                  >
                    <Text>{result.idea.title}</Text>
                    <Text size="xs" c="dimmed">
                      <Highlight highlight={query}>
                        {result.idea.contentSummary}
                      </Highlight>
                    </Text>
                  </Menu.Item>
                  <Menu.Divider />
                </>
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
