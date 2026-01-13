import { useEffect, useMemo, useRef, useState } from "react";
import { useSearch } from "../../contexts/SearchContext";
import { SearchBar } from "./SearchBar";
import {
  Container,
  Group,
  Loader,
  MantineColor,
  Space,
  Stack,
  Text,
  Transition,
  Switch,
  Button,
  Collapse,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { getOS } from "../../utils/platform";
import { useLayout } from "../../contexts/LayoutContext";
import styles from "./Search.module.scss";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import useRabbithole from "../../hooks/useRabbithole";
import { RabbitholeIcon, SpyglassIcon } from "../Utils/Icons/Icons";
import { ArrowClockwiseIcon, FunnelIcon, IconProps, PlusIcon, SparkleIcon } from "@phosphor-icons/react";
import { ISearchResultValue } from "../../../app/services/Search";
import useFetch from "../../hooks/useFetch";
import { IConnectable } from "../../../app/services/Graph";
import PaperThing from "../Display/Paper/Things/PaperThing";
import { getThingPropsFromConnectable } from "../Display/Paper/Things/thingUtils";
import PaperSearchResult from "../Display/Paper/PaperSearchResult/PaperSearchResult";
import { getNodeDescription, getNodeTitle } from "../../utils/graph";
import { formatDateTime } from "../../utils/formatting";
import ScopeBuilder from "./ScopeBuilder/ScopeBuilder";
import { useSpyglassService } from "../../hooks/useSpyglassService";
import GlimpseModeDisplay from "../Utils/Spyglass/GlimpseModeDisplay";

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
      scope: { get: scope, set: setScope },
      glimpseMode: { get: glimpseMode, set: setGlimpseMode },
      showScope: { get: showScope, set: setShowScope },
    },
  } = useSearch();

  const {
    search: searchGlimpse,
    glimpseResult,
    resultsMap,
    loading: loadingGlimpse,
    error: errorGlimpse,
    reset: resetGlimpse,
  } = useSpyglassService();

  const handleGlimpseSearch = () => {
    if (!searchQuery) return;
    searchGlimpse({
      query: searchQuery,
      deepAnalysis: false,
      rabbithole: scope.rabbithole,
      tags: scope.tags,
      date: scope.date,
    });
  };

  useEffect(() => {
    if (glimpseMode && searchQuery) {
      // Debounce or trigger on explicit action? 
      // For now, let's trigger on explicit "Enter" or button press if we can hook into SearchBar.
      // SearchBar triggers global query update.
    } else {
      resetGlimpse();
    }
  }, [glimpseMode]);

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
      
      <Group justify="flex-end" mb="xs">
        <Tooltip label="Adjust Scope" position="left" withArrow>
          <ActionIcon 
            variant={showScope ? "filled" : "light"} 
            size="sm" 
            onClick={() => setShowScope(!showScope)}
            color="gray"
          >
            <FunnelIcon size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Collapse in={showScope}>
        <ScopeBuilder value={scope} onChange={setScope} />
      </Collapse>
      
      <Group justify="space-between" mb="sm">
        <Switch
          label="Glimpse Mode"
          size="xs"
          checked={glimpseMode}
          onChange={(event) => setGlimpseMode(event.currentTarget.checked)}
          color="blue"
          thumbIcon={
            glimpseMode ? (
              <SparkleIcon size={12} weight="bold" color="var(--mantine-color-blue-6)" />
            ) : (
              <SpyglassIcon size={12} color="var(--mantine-color-gray-6)" />
            )
          }
        />
        {glimpseMode && (
           <Button 
             size="xs" 
             variant="light" 
             disabled={!searchQuery || loadingGlimpse}
             onClick={handleGlimpseSearch}
           >
             Go
           </Button>
        )}
      </Group>

      {glimpseMode && (
        <div className={styles.glimpseContainer}>
          {loadingGlimpse && (
            <Group justify="center" my="md">
              <Loader size="sm" type="dots" />
              <Text size="sm" c="dimmed">Glimpsing...</Text>
            </Group>
          )}
          {errorGlimpse && <Text c="red" size="sm">{errorGlimpse}</Text>}
          {glimpseResult && (
            <>
              <GlimpseModeDisplay
                glimpseResult={glimpseResult}
                resultsMap={resultsMap || {}}
              />
              <Group justify="flex-end" mt="sm">
                 <Link
                  to={`/spyglass?q=${encodeURIComponent(searchQuery)}&deep=true`}
                  style={{ textDecoration: 'none' }}
                >
                  <Button 
                    size="xs" 
                    variant="default"
                    leftSection={<SpyglassIcon size={14} />}
                  >
                    Deep Focus in Spyglass
                  </Button>
                </Link>
              </Group>
            </>
          )}
        </div>
      )}

      {!glimpseMode && !!searchQuery && !searchResults && !loading && (
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
                        <PaperThing
                          key={thing.id.toString()}
                          {...props}
                          draggable={true}
                        />
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
                const preview =
                  (s.highlightText ?? getNodeDescription(s.value)) ||
                  "No preview available.";
                const updatedAt = formatDateTime(s.value.updatedAt);

                if (!title || !preview || !updatedAt) {
                  return null;
                }

                return (
                  <PaperSearchResult
                    draggable={true}
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
