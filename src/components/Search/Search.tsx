import { useCallback, useMemo, useRef, useState } from "react";
import { useSearch } from "../../contexts/SearchContext";
import { SearchBar } from "./SearchBar";
import {
  Button,
  Container,
  Group,
  MantineColor,
  Space,
  Stack,
  Text,
} from "@mantine/core";
import { getOS } from "../../utils/platform";
import { useLayout } from "../../contexts/LayoutContext";
import styles from "./Search.module.scss";
import { Link, useNavigate } from "react-router";
import { ISafeIdea } from "../../../app/database/models/ideas";
import { useAuth } from "../../contexts/AuthContext";
import useRabbithole from "../../hooks/useRabbithole";
import { RabbitholeIcon, SpyglassIcon } from "../Utils/Icons/Icons";
import { IconProps } from "@phosphor-icons/react";
import ConnectableThing from "../Display/Interactions/Connections/ConnectableThing";
import CollapseButton from "../Display/Interactions/CollapseButton";
import { ISearchResultValue } from "../../../app/services/Search";

export type ISearchResultAction = {
  id: string;
  label: string;
  icon?: React.ReactElement<IconProps>;
  onClick: (event: React.MouseEvent, thing: ISearchResultValue) => void;
  color?: MantineColor;
  variant?:
    | "filled"
    | "light"
    | "outline"
    | "default"
    | "subtle"
    | "transparent"
    | "white";
  disabled?: boolean;
};

interface ISearchProps {
  resultActions?: ((value: ISearchResultValue) => ISearchResultAction)[];
  resultFilter?: (id: string) => boolean;
  ignoreRabbithole?: boolean;
}

export default function Search({
  resultActions,
  resultFilter,
  ignoreRabbithole,
}: ISearchProps) {
  const [loading, setLoading] = useState(false);
  const os = getOS();
  const ctrl = os !== "macos";
  const meta = os === "macos";
  const primaryKey = os === "macos" ? "⌘" : "Ctrl";

  const { isSuperuser } = useAuth();

  const { isMobile } = useLayout();

  const { currentRabbithole } = useRabbithole();
  const withinRabbithole = ignoreRabbithole ? false : !!currentRabbithole;

  const {
    global: {
      results: { get: searchResults, set: setResults },
      query: { get: searchQuery },
    },
  } = useSearch();

  const handleResultsClear = useCallback(() => {
    setResults(null);
  }, []);

  const startTimeRef = useRef<number | null>(null);
  const resultsTimeRef = useRef<number | null>(null);

  const filteredResults = useMemo(() => {
    if (!searchResults) return null;
    if (!resultFilter) return searchResults;
    return searchResults.filter((r) => {
      return resultFilter(r.id.toString());
    });
  }, [searchResults, resultFilter]);

  const timeTaken = useMemo(() => {
    if (!startTimeRef.current || !resultsTimeRef.current) return null;
    return ((resultsTimeRef.current - startTimeRef.current) / 1000).toFixed(2);
  }, [startTimeRef.current, resultsTimeRef.current]);

  const navigate = useNavigate();

  return (
    <div className={styles.searchWrapper}>
      <SearchBar
        ignoreRabbithole={ignoreRabbithole}
        onResultsClear={handleResultsClear}
        onSearchStart={() => {
          startTimeRef.current = Date.now();
          setLoading(true);
        }}
        onSearchEnd={() => {
          resultsTimeRef.current = Date.now();
          setLoading(false);
        }}
        onShortcuts={[{ key: "/", ctrl, meta }]}
        placeholder={
          isMobile ? "Search..." : `Press ${primaryKey} + / to focus...`
        }
      />
      {!!searchQuery && !searchResults && !loading && (
        <>
          <Space my="lg" />
          <Link
            to={`/spyglass?q=${encodeURIComponent(searchQuery)}`}
            style={{
              textDecoration: "none",
            }}
          >
            <Group c="dark.3" gap="xs">
              <Text size="xs">
                <Group gap="xs">
                  Open in Spyglass
                  <SpyglassIcon size={12} color="var(--mantine-color-dark-3)" />
                </Group>
              </Text>
            </Group>
          </Link>
        </>
      )}
      {!searchQuery &&
        (!searchResults || !filteredResults?.length) &&
        !loading && (
          <>
            <Space my="lg" />
            <Group gap="xs">
              {withinRabbithole && (
                <RabbitholeIcon size={12} color="var(--mantine-color-dimmed)" />
              )}
              <Text c="dimmed" size="xs">
                <Group gap="xs">
                  Search{" "}
                  {withinRabbithole ? (
                    <>"{currentRabbithole?.name}"</>
                  ) : (
                    "anything..."
                  )}
                </Group>
              </Text>
              <Text c="dimmed" size="xs"></Text>
            </Group>
          </>
        )}
      {filteredResults && (
        <Container w="100%" className={styles.results} p="0">
          <Space my="lg" />
          <Text c="dimmed" size="sm">
            Found {filteredResults.length} result
            {filteredResults.length === 1 ? "" : "s"}
            {isSuperuser && !!timeTaken ? ` in ${timeTaken}s` : ""}
            {withinRabbithole ? ` in "${currentRabbithole?.name}"` : ""}
          </Text>
          <Space my="sm" />
          {!filteredResults.length && <Text size="sm">No results :(</Text>}
          <Stack>
            {filteredResults
              ?.map((s, i) => {
                const actions = resultActions?.map((action) => {
                  return action(s.value);
                });

                if (!actions) {
                  return (
                    <ConnectableThing
                      thing={s.value}
                      onClick={(thing) => {
                        navigate(`/${thing.type}/${thing.id.toString()}`);
                      }}
                    />
                  );
                }

                return (
                  <CollapseButton
                    key={s.id.toString()}
                    target={<ConnectableThing thing={s.value} />}
                    details={
                      <>
                        <Group>
                          {actions.map((a) => {
                            return (
                              <Button
                                variant={a.variant || "light"}
                                size="xs"
                                color={a.color || "gray"}
                                onClick={(e) => {
                                  a.onClick(e, s.value);
                                }}
                                title={a.label}
                                leftSection={a.icon}
                                radius="md"
                              >
                                {a.label}
                              </Button>
                            );
                          })}
                        </Group>
                      </>
                    }
                  />
                );
              })
              .filter((r) => !!r)}
          </Stack>
        </Container>
      )}
    </div>
  );
}
