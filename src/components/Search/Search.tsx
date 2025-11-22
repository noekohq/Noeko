import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearch } from "../../contexts/SearchContext";
import { SearchBar } from "./SearchBar";
import {
  Button,
  Container,
  Group,
  Loader,
  MantineColor,
  Space,
  Stack,
  Text,
  Transition,
} from "@mantine/core";
import { getOS } from "../../utils/platform";
import { useLayout } from "../../contexts/LayoutContext";
import styles from "./Search.module.scss";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import useRabbithole from "../../hooks/useRabbithole";
import { RabbitholeIcon, SpyglassIcon } from "../Utils/Icons/Icons";
import { ArrowClockwiseIcon, IconProps, PlusIcon } from "@phosphor-icons/react";
import ConnectableThing from "../Display/Interactions/Connections/ConnectableThing";
import CollapseButton from "../Display/Interactions/CollapseButton";
import { ISearchResultValue } from "../../../app/services/Search";
import useFetch from "../../hooks/useFetch";
import { IConnectable } from "../../../app/services/Graph";
import PaperThing from "../Display/Paper/Things/PaperThing";
import { getThingPropsFromConnectable } from "../Display/Paper/Things/thingUtils";
import PaperSearchResult from "../Display/Paper/PaperSearchResult/PaperSearchResult";
import { getNodeDescription, getNodeTitle } from "../../utils/graph";
import { formatDateTime } from "../../utils/formatting";

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

  const {
    data: recent,
    load: loadRecent,
    loading: loadingRecent,
  } = useFetch<undefined, IConnectable[]>({
    url: `/insights/recent?limit=20`,
    method: "GET",
  });
  useEffect(() => {
    if (!searchResults?.length && !searchQuery.length) {
      loadRecent();
    }
  }, [searchResults]);

  return (
    <div className={styles.searchWrapper}>
      <SearchBar
        ignoreRabbithole={ignoreRabbithole}
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
          <Group>
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
                    <SpyglassIcon
                      size={12}
                      color="var(--mantine-color-dark-3)"
                    />
                  </Group>
                </Text>
              </Group>
            </Link>
          </Group>
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
              <Text c="dimmed" size="sm">
                <Group gap="xs" component="span">
                  Search{" "}
                  {withinRabbithole ? (
                    <>"{currentRabbithole?.name}"</>
                  ) : (
                    "anything..."
                  )}
                </Group>
              </Text>
            </Group>
          </>
        )}
      {!searchQuery.length && !searchResults?.length && (
        <>
          <Text size="sm" c="dark.4" fw="bold" my="md">
            <Group gap="xs">
              <ArrowClockwiseIcon weight="bold" />
              RECENT
              <Transition mounted={loadingRecent} transition="fade-left">
                {(style) => {
                  return <Loader style={style} size="xs" color="gray" />;
                }}
              </Transition>
            </Group>
          </Text>
          <Transition
            mounted={!!recent && recent.length > 0}
            transition="fade-up"
          >
            {(style) => {
              return (
                <Stack style={style} gap="sm">
                  {recent
                    ?.map((thing, i) => {
                      const props = getThingPropsFromConnectable(
                        thing,
                        {},
                        true,
                      );

                      return (
                        <PaperThing key={thing.id.toString()} {...props} />
                      );
                    })
                    .filter((r) => !!r)}
                </Stack>
              );
            }}
          </Transition>
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
                const title = getNodeTitle(s.value);
                const preview = s.highlightText ?? getNodeDescription(s.value);
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
