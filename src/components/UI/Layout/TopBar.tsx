import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./TopBar.module.scss";
import { useSearch } from "../../../contexts/SearchContext";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { ActionIcon, Group, Loader, Stack, Text } from "@mantine/core";
import { useLayout } from "../../../contexts/LayoutContext";
import useSearchQuery from "../../../hooks/useSearchQuery";
import useRabbithole from "../../../hooks/useRabbithole";
import PaperChip from "../../Display/Paper/PaperChip";
import { getRelativeDateISO } from "../../../utils/datetime";
import ConnectableThing from "../../Display/Interactions/Connections/ConnectableThing";
import { useNavigate } from "react-router";
import { getNodeDescription, getNodeTitle } from "../../../utils/graph";
import { formatDateTime } from "../../../utils/formatting";
import PaperSearchResult from "../../Display/Paper/PaperSearchResult/PaperSearchResult";
import { useInteraction } from "../../../contexts/InteractionContext";

export default function TopBar() {
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

  const getRandomQuip = useCallback(() => {
    return quips[Math.floor(Math.random() * quips.length)];
  }, []);

  const { isDownRabbithole, currentRabbithole } = useRabbithole();
  const {
    global: {
      query: { set: setQuery, get: query },
      results: { set: setResults },
    },
  } = useSearch();
  const { search, results, loading, complete } = useSearchQuery();
  const { isMobile } = useLayout();

  const [isFocused, setIsFocused] = useState(false);
  const [quip, setQuip] = useState(() => getRandomQuip());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isFocused) {
      inputRef.current?.focus();
      setQuip(getRandomQuip());
    } else {
      inputRef.current?.blur();
    }
  }, [isFocused, getRandomQuip]);

  const showResults = isFocused || query.length > 0;

  const clear = () => {
    setQuery("");
    setResults(null);
    setDateAfter("");
  };

  const [dateAfter, setDateAfter] = useState<string | undefined>();

  const handleSearch = () => {
    if (!query) {
      return;
    }
    search(query, {
      date: {
        updatedAt: {
          after: dateAfter,
        },
      },
    });
  };

  useEffect(() => {
    handleSearch();
  }, [dateAfter]);

  const pastWeekISO = getRelativeDateISO("week");
  const pastMonthISO = getRelativeDateISO("month");
  const pastYearISO = getRelativeDateISO("year");

  const navigate = useNavigate();

  const {
    actions: { newRabbithole },
  } = useInteraction();

  useEffect(() => {
    return () => {
      setResults(null);
      setQuery("");
    };
  }, []);

  if (!isMobile) return null;

  return (
    <div
      className={`${styles.topBar} ${isFocused ? styles.focused : ""} ${
        isDownRabbithole ? styles.downRabbithole : ""
      }`}
      onClick={() => {
        if (!isFocused) {
          setIsFocused(true);
        }
      }}
    >
      {isFocused && (
        <div className={styles.backdrop} onClick={() => setIsFocused(false)} />
      )}
      <div
        className={`${styles.search} ${isFocused ? styles.focused : ""} ${
          isDownRabbithole ? styles.downRabbithole : ""
        }`}
      >
        <input
          className={styles.input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={quip}
          ref={inputRef}
          onFocus={() => setIsFocused(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearch();
            }
          }}
        />
        <button
          className={styles.toggle}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            if (showResults) {
              clear();
              setIsFocused(false);
            } else {
              setIsFocused(true);
            }
          }}
        >
          {showResults ? (
            <XIcon weight="bold" className={styles.icon} />
          ) : (
            <MagnifyingGlassIcon weight="bold" className={styles.icon} />
          )}
        </button>
      </div>
      {isFocused && (
        <div
          className={styles.searchPanel}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Stack gap="md">
            {!results?.length && !loading && (
              <>
                <Text size="sm" c="dimmed">
                  Search for anything...
                </Text>
              </>
            )}
            <Group>
              <PaperChip
                onClick={() =>
                  setDateAfter((prev) =>
                    prev === pastWeekISO ? undefined : pastWeekISO,
                  )
                }
                active={dateAfter === pastWeekISO}
              >
                Past Week
              </PaperChip>
              <PaperChip
                onClick={() =>
                  setDateAfter((prev) =>
                    prev === pastMonthISO ? undefined : pastMonthISO,
                  )
                }
                active={dateAfter === pastMonthISO}
              >
                Past Month
              </PaperChip>
              {/*<PaperChip
                onClick={() =>
                  setDateAfter((prev) =>
                    prev === pastYearISO ? undefined : pastYearISO,
                  )
                }
                active={dateAfter === pastYearISO}
              >
                Past Year
              </PaperChip>*/}
            </Group>
            {loading && (
              <Group align="center" justify="flex-start" gap="sm">
                <Loader size="xs" color="gray" />
                <Text size="sm">Loading results...</Text>
              </Group>
            )}
            {complete && results && results.length > 0 && (
              <>
                <Text size="md" fw="bold" c="dimmed">
                  Results ({results.length})
                </Text>
                {/*<Group wrap="nowrap">
                  <ActionIcon
                    variant="light"
                    color="yellow"
                    radius="md"
                    size={"md"}
                  >
                    <RabbitholeIcon
                      size={16}
                      color="var(--mantine-color-dark-2)"
                    />
                  </ActionIcon>
                </Group>*/}
                <Stack gap="lg">
                  {results.map((s) => {
                    const title = getNodeTitle(s.value);
                    const preview =
                      s.highlightText ?? getNodeDescription(s.value);
                    const updatedAt = formatDateTime(s.value.updatedAt);

                    if (!title || !preview || !updatedAt) {
                      return null;
                    }

                    return (
                      <PaperSearchResult
                        node={s.value}
                        title={title || "Untitled Thing"}
                        snippet={preview}
                        meta={`Modified ${updatedAt}`}
                        onSelect={(node) => {
                          navigate(`/${node.type}/${node.id.toString()}`);
                        }}
                      />
                    );
                  })}
                </Stack>
              </>
            )}
            {complete && results && results.length < 1 && (
              <Text size="md" fw="bold" c="dimmed">
                No Results :(
              </Text>
            )}
          </Stack>
        </div>
      )}
    </div>
  );
}
