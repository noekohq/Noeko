import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./TopBar.module.scss";
import {
  MagnifyingGlassIcon,
  PushPinIcon,
  XIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  ActionIcon,
  Center,
  Group,
  Loader,
  Stack,
  Text,
  Transition,
} from "@mantine/core";
import { useLayout } from "../../../contexts/LayoutContext";
import useSearchQuery from "../../../hooks/useSearchQuery";
import useRabbithole from "../../../hooks/useRabbithole";
import PaperChip from "../../Display/Paper/PaperChip";

import { getNodeDescription, getNodeTitle } from "../../../utils/graph";
import { formatDateTime } from "../../../utils/formatting";
import PaperSearchResult from "../../Display/Paper/PaperSearchResult/PaperSearchResult";
import { useInteraction } from "../../../contexts/InteractionContext";
import PaperButton from "../../Display/Paper/PaperButton";
import LangtonsAntLoader from "../../Utils/Loading/AntLoader";
import { getRelativeDateISO } from "../../../utils/datetime";

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

  const [dateAfter, setDateAfter] = useState<string | undefined>();

  const { isDownRabbithole } = useRabbithole();
  const {
    inputValue,
    setInputValue,
    handleSearchSubmit,
    results,
    loading,
    complete,
    reset,
  } = useSearchQuery({
    params: {
      ...(dateAfter && {
        date: {
          updatedAt: {
            after: dateAfter,
          },
        },
      }),
    },
  });
  const {
    isMobile,
    scroll: { isScrolled, scrollDirection },
  } = useLayout();

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

  const showResults = isFocused || inputValue.length > 0;

  const clear = () => {
    reset();
    setDateAfter("");
  };

  useEffect(() => {
    handleSearchSubmit();
  }, [dateAfter]);

  const pastWeekISO = getRelativeDateISO("week");
  const pastMonthISO = getRelativeDateISO("month");

  const navigate = useNavigate();

  const location = useLocation();
  const actionIconActive = location.pathname.includes("pinned");

  if (!isMobile) return null;

  const isHidden = () => {
    if (isFocused) return false;
    return isScrolled && scrollDirection === "down";
  };

  return (
    <div
      className={`${styles.topBar} ${isFocused ? styles.focused : ""} ${
        isDownRabbithole ? styles.downRabbithole : ""
      } ${isHidden() ? styles.hidden : ""}`}
    >
      <div
        className={styles.searchWrapper}
        onClick={() => {
          if (!isFocused) {
            setIsFocused(true);
          }
        }}
      >
        {isFocused && (
          <div
            className={styles.backdrop}
            onClick={() => setIsFocused(false)}
          />
        )}
        <div
          className={`${styles.search} ${isFocused ? styles.focused : ""} ${
            isDownRabbithole ? styles.downRabbithole : ""
          }`}
        >
          <input
            className={styles.input}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={quip}
            ref={inputRef}
            onFocus={() => setIsFocused(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearchSubmit();
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
              <div className={styles.filters}>
                <Stack gap="sm">
                  <Text fw="bold" c="dimmed">
                    FILTERS
                  </Text>
                  <Group>
                    <PaperChip
                      onClick={() =>
                        setDateAfter((prev) =>
                          prev === pastWeekISO ? undefined : pastWeekISO,
                        )
                      }
                      active={dateAfter === pastWeekISO}
                      disabled={loading}
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
                      disabled={loading}
                    >
                      Past Month
                    </PaperChip>
                  </Group>
                </Stack>
              </div>
              {loading && (
                <Center h={500}>
                  <LangtonsAntLoader cellSize={18} stepsPerSecond={10} />
                </Center>
              )}
              <Transition
                mounted={complete && !!results && results.length > 0}
                transition="fade-up"
              >
                {(styles) => {
                  return (
                    <Stack gap="sm" style={styles}>
                      {results?.map((s) => {
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
                            onSelect={(node) => {
                              navigate(`/${node.type}/${node.id.toString()}`);
                            }}
                            artifacts={
                              "author" in s.value && s.value.author
                                ? [
                                    {
                                      icon: UserIcon,
                                      label:
                                        `Shared by ${s.value.author.firstName} ${s.value.author.lastName}`.trim(),
                                    },
                                  ]
                                : undefined
                            }
                          />
                        );
                      })}
                    </Stack>
                  );
                }}
              </Transition>
              {complete && results && results.length < 1 && (
                <Stack>
                  <Text size="md" fw="bold" c="dimmed">
                    There's nothing here!
                  </Text>
                  <Link
                    to={`/spyglass?q=${inputValue}`}
                    style={{ textDecoration: "none" }}
                    onClick={() => {
                      setIsFocused(false);
                    }}
                  >
                    <PaperButton>Search with Spyglass?</PaperButton>
                  </Link>
                </Stack>
              )}
            </Stack>
          </div>
        )}
      </div>
      {!isFocused && !actionIconActive && (
        <Link to={"/pinned"}>
          <div className={styles.actionButton} title="Pins">
            <PushPinIcon weight="bold" />
          </div>
        </Link>
      )}
    </div>
  );
}
