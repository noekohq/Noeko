import { Group, Loader, Stack, Text, Button, Transition } from "@mantine/core";
import { getOS } from "../../utils/platform";
import styles from "./Search.module.scss";
import { Link } from "react-router";
import {
  BrainIcon,
  SparkleIcon,
  ArrowClockwiseIcon,
} from "@phosphor-icons/react";
import type { ISearchResultValue } from "../../../shared/types/search";
import GlimpseModeDisplay from "../Utils/Spyglass/GlimpseModeDisplay";
import useShortcuts from "../../hooks/useShortcuts";
import PaperButton from "../Display/Paper/PaperButton";
import ScopeBuilder from "./ScopeBuilder/ScopeBuilder";
import { SearchBar } from "./SearchBar";
import useSearchQuery from "../../hooks/useSearchQuery";
import { SpyglassIcon } from "../Utils/Icons/Icons";
import { IconProps } from "@phosphor-icons/react";
import PaperSearchResult from "../Display/Paper/PaperSearchResult/PaperSearchResult";
import { getNodeDescription, getNodeTitle } from "../../utils/graph";

export type ISearchResultAction = {
  id: string;
  label: string;
  icon?: React.ReactElement<IconProps>;
  onClick: () => void;
  disabled?: boolean;
};

type ISearchProps = {
  resultFilter?: (id: string) => boolean;
  ignoreRabbithole?: boolean;
  resultActions?: ((value: ISearchResultValue) => ISearchResultAction)[];
};

export default function Search({
  resultFilter,
  ignoreRabbithole,
  resultActions,
}: ISearchProps) {
  const os = getOS();
  const ctrl = os !== "macos";
  const meta = os === "macos";

  const {
    inputValue,
    setInputValue,
    loading,
    scope,
    setScope,
    glimpseMode,
    setGlimpseMode,
    handleSearchSubmit,
    reset,
    loadingGlimpse,
    errorGlimpse,
    glimpseResult,
    resultsMap,
    withinRabbithole,
    searchQuery,
    filteredResults,
    recent,
    loadingRecent,
  } = useSearchQuery({
    resultFilter,
    ignoreRabbithole,
  });

  useShortcuts({
    shortcuts: [
      {
        keys: { key: ".", meta: true },
        run: () => setGlimpseMode(!glimpseMode),
      },
      {
        keys: { meta: true, shift: true, key: "s" },
        run: (e) => {
          e.preventDefault();
          setGlimpseMode(!glimpseMode);
        },
      },
      {
        keys: { ctrl: true, shift: true, key: "s" },
        run: (e) => {
          e.preventDefault();
          setGlimpseMode(!glimpseMode);
        },
      },
    ],
  });

  return (
    <div className={styles.searchWrapper}>
      <SearchBar
        query={inputValue || ""}
        setQuery={setInputValue}
        loading={loading}
        onClear={reset}
        withinRabbithole={withinRabbithole}
        onSearchSubmit={handleSearchSubmit}
        onShortcuts={[{ key: "/", ctrl, meta }]}
      />

      <Stack gap="xs">
        <PaperButton
          withBorder
          fullWidth
          size="md"
          onClick={() => setGlimpseMode(!glimpseMode)}
        >
          <Group gap="xs" justify="center" w={"100%"}>
            {glimpseMode ? (
              <SparkleIcon size={12} weight="fill" />
            ) : (
              <BrainIcon size={12} weight="fill" />
            )}

            {glimpseMode ? "Spyglass" : "Smart"}
          </Group>
        </PaperButton>

        <ScopeBuilder value={scope} onChange={setScope} />
      </Stack>

      {glimpseMode && (
        <div className={styles.glimpseContainer}>
          {errorGlimpse && (
            <Text c="red" size="sm">
              {errorGlimpse}
            </Text>
          )}

          {glimpseResult && (
            <>
              <GlimpseModeDisplay
                view="compact"
                glimpseResult={glimpseResult}
                resultsMap={resultsMap || {}}
                query={searchQuery}
                loading={loadingGlimpse}
              />

              <Group justify="flex-end" mt="sm">
                <Button
                  component={Link}
                  to={`/spyglass?q=${encodeURIComponent(searchQuery)}&deep=true`}
                  size="xs"
                  variant="default"
                  leftSection={<SpyglassIcon size={14} />}
                >
                  Deep Focus in Spyglass
                </Button>
              </Group>
            </>
          )}
        </div>
      )}

      {!glimpseMode && (
        <Stack>
          {!searchQuery.length && !filteredResults?.length && (
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
                      {recent?.map((r, i) => {
                        const title = getNodeTitle(r);

                        const preview = getNodeDescription(r);

                        if (!title || !preview) return null;

                        return (
                          <PaperSearchResult
                            key={r.id.toString()}
                            node={r}
                            title={title}
                            snippet={preview}
                          />
                        );
                      })}
                    </Stack>
                  );
                }}
              </Transition>
            </>
          )}

          {filteredResults?.map((r) => {
            const title = getNodeTitle(r.value);

            const preview = r.highlightText ?? getNodeDescription(r.value);

            if (!title || !preview) return null;

            const actions = resultActions
              ? resultActions.map((f) => f(r.value))
              : undefined;

            return (
              <PaperSearchResult
                key={r.id.toString()}
                node={r.value}
                title={title}
                snippet={preview}
                actions={actions}
              />
            );
          })}
        </Stack>
      )}
    </div>
  );
}
