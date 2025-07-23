import React, { useState, useMemo, useEffect, useRef } from "react";
import useFetch from "../../hooks/useFetch";
import {
  Combobox,
  TextInput,
  Loader,
  Text,
  CloseButton,
  ActionIcon,
  useCombobox,
  ScrollArea,
  Group,
  Stack,
  Badge,
  MantineSize,
} from "@mantine/core";
import { TagIcon } from "@phosphor-icons/react";
import { ITag } from "../../../app/database/models/tag";
import { useSettings } from "../../contexts/SettingsContext";
import styles from "./SuggestTags.module.scss";

interface SuggestTagsProps {
  onSelect: (tag: ITag) => void;
  limit?: number;
  placeholder?: string;
  omit?: string[];
  debounce?: number;
  size?: MantineSize;
}

const SuggestTags: React.FC<SuggestTagsProps> = ({
  onSelect,
  limit,
  placeholder = "Search or add tags...",
  omit = [],
  debounce = 300,
  size = "xs",
}) => {
  const {
    ui: {
      theme: {
        scheme: { actual: scheme },
      },
    },
  } = useSettings();

  const inputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("");
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, debounce);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [searchQuery, debounce]);

  const {
    data: suggestions,
    loading,
    errors,
  } = useFetch<undefined, ITag[]>({
    url: "/search/tags/suggest",
    method: "GET",
    query: {
      query: debouncedSearchQuery,
      ...(limit && { limit: String(limit) }),
    },
    runOnDependencies: [debouncedSearchQuery],
    onError: (err) => {
      console.error("Error fetching tag suggestions:", err);
    },
  });

  const comboboxData: ITag[] = useMemo(() => {
    if (!suggestions) {
      return [];
    }

    const filteredSuggestions = suggestions.filter(
      (tag) => !omit.includes(tag.id.toString()),
    );

    return filteredSuggestions;
  }, [suggestions, omit]);

  const handleOptionSubmit = (value: string) => {
    const selectedItem = comboboxData.find(
      (item) => item.id.toString() === value,
    );
    if (selectedItem) {
      onSelect(selectedItem);
      setSearchQuery("");
      setDebouncedSearchQuery("");
      combobox.closeDropdown();
    }
  };

  const handleClearInput = () => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    combobox.closeDropdown();
  };

  const rightSection = loading ? (
    <Loader size="xs" />
  ) : searchQuery ? (
    <ActionIcon
      onClick={handleClearInput}
      size="sm"
      variant="transparent"
      aria-label="Clear input"
    >
      <CloseButton size="sm" />
    </ActionIcon>
  ) : null;

  return (
    <Combobox
      onOptionSubmit={handleOptionSubmit}
      store={combobox}
      withinPortal={false}
    >
      <Combobox.Target>
        <TextInput
          ref={inputRef}
          placeholder={placeholder}
          value={searchQuery}
          size={size}
          classNames={{
            input: styles.input,
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              inputRef.current?.blur();
            }
          }}
          onChange={(event) => {
            setSearchQuery(event.currentTarget.value);
            combobox.openDropdown();
            combobox.updateSelectedOptionIndex();
          }}
          onClick={() => combobox.openDropdown()}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => {
            setTimeout(() => {
              if (!combobox.dropdownOpened) {
                combobox.closeDropdown();
              }
            }, 150);
          }}
          leftSection={<TagIcon size={16} />}
          rightSection={rightSection}
          rightSectionWidth={40}
          error={errors && errors.length > 0 ? errors.join(", ") : false}
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          <ScrollArea.Autosize mah={200} type="scroll">
            {loading && (
              <Combobox.Option value="loading" disabled>
                <Group gap="xs">
                  <Loader size="xs" />
                  <Text size="sm">Loading suggestions...</Text>
                </Group>
              </Combobox.Option>
            )}

            {!loading && errors && errors.length > 0 && (
              <Combobox.Option value="error" disabled>
                <Text c="red.4" size="sm">
                  Failed to load: {errors.join(", ")}
                </Text>
              </Combobox.Option>
            )}

            {!loading &&
              !errors?.length &&
              comboboxData.length === 0 &&
              searchQuery.trim().length > 0 && (
                <Combobox.Empty>
                  Nothing found for "{searchQuery}"
                </Combobox.Empty>
              )}

            {!loading &&
              !errors?.length &&
              comboboxData.length === 0 &&
              searchQuery.trim().length === 0 && (
                <Combobox.Empty>Type to search for tags</Combobox.Empty>
              )}

            {!loading &&
              !errors?.length &&
              comboboxData.map((item) => (
                <Combobox.Option
                  value={item.id.toString()}
                  key={item.id.toString()}
                >
                  <Stack gap={"xs"}>
                    <Badge color={scheme === "dark" ? "dark.7" : "dark.3"}>
                      {item.name}
                    </Badge>
                    {item.description && (
                      <Text size="xs" c="dimmed">
                        {item.description}
                      </Text>
                    )}
                  </Stack>
                </Combobox.Option>
              ))}
          </ScrollArea.Autosize>
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
};

export default SuggestTags;
