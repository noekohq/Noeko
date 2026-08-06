import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Collapse,
  Group,
  Loader,
  Slider,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  ArrowCounterClockwiseIcon,
  CaretDownIcon,
  InfoIcon,
  PlusIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { api } from "@infrastructure/api/client";
import PaperDrawer from "@core/design/components/Paper/PaperDrawer";
import PaperChip from "@core/design/components/Paper/PaperChip";
import PaperSegmentedControl from "@core/design/components/Paper/PaperSegmentedControl";
import { SearchBar } from "@domains/discovery/components/Search/SearchBar";
import { getNodeDescription, getNodeTitle, IconMap } from "@infrastructure/graph/utils";
import { IConnectable } from "../../../../../shared/types/constellation";
import {
  IRabbithole,
  IRabbitholeActivity,
  IRabbitholeRecommendationPolicy,
  IRabbitholeSuggestion,
} from "../../../../../shared/types/rabbithole";
import {
  GLOBAL_SEMANTIC_SEARCH_THRESHOLD,
  getDefaultRabbitholeSimilarityThreshold,
} from "../../../../../shared/constants/semantic";
import styles from "./ManageRabbithole.module.scss";

const defaultPolicy: IRabbitholeRecommendationPolicy = {
  mode: "suggest",
  threshold: GLOBAL_SEMANTIC_SEARCH_THRESHOLD,
  types: ["idea", "task", "source", "excerpt"],
};

interface IManageRabbitholeProps {
  rabbithole: IRabbithole;
  opened: boolean;
  onClose: () => void;
  onChanged: () => void;
  variant?: "drawer" | "panel";
  focusRequest?: number;
  sharedSuggestions?: IRabbitholeSuggestion[];
  onSuggestionsChanged?: (suggestions: IRabbitholeSuggestion[]) => void;
}

const connectableTypes: IRabbitholeRecommendationPolicy["types"] = [
  "idea",
  "task",
  "source",
  "excerpt",
];

export default function ManageRabbithole({
  rabbithole,
  opened,
  onClose,
  onChanged,
  variant = "drawer",
  focusRequest = 0,
  sharedSuggestions,
  onSuggestionsChanged,
}: IManageRabbitholeProps) {
  const searchRef = useRef<HTMLTextAreaElement>(null);
  const id = rabbithole.id.toString();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<IConnectable[]>([]);
  const [suggestions, setSuggestions] = useState<IRabbitholeSuggestion[]>([]);
  const [activity, setActivity] = useState<IRabbitholeActivity[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [filtersOpened, setFiltersOpened] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [policy, setPolicy] = useState<IRabbitholeRecommendationPolicy>(
    rabbithole.recommendationPolicy ?? defaultPolicy
  );

  const includedIds = useMemo(
    () => new Set((rabbithole.includes ?? []).map((thing) => thing.id.toString())),
    [rabbithole.includes]
  );

  const loadSuggestions = async (reconcile = false) => {
    setLoadingSuggestions(true);
    setError(null);
    try {
      const response = reconcile
        ? await api.post(`/rabbitholes/${id}/suggestions/reconcile`, { limit: 30 })
        : await api.get(`/rabbitholes/${id}/suggestions`);
      const nextSuggestions = response.data.data ?? [];
      const resolvedSuggestions =
        nextSuggestions.length || !sharedSuggestions?.length ? nextSuggestions : sharedSuggestions;
      setSuggestions(resolvedSuggestions);
      if (nextSuggestions.length || !sharedSuggestions?.length) {
        onSuggestionsChanged?.(nextSuggestions);
      }
      const activityResponse = await api.get(`/rabbitholes/${id}/activity`);
      setActivity(activityResponse.data.data ?? []);
      if (reconcile) onChanged();
    } catch {
      setError("Suggestions could not be refreshed. Your current workspace was not changed.");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    if (!opened) return;
    setPolicy(rabbithole.recommendationPolicy ?? defaultPolicy);
    void loadSuggestions(false);
  }, [opened, id]);

  useEffect(() => {
    if (sharedSuggestions) setSuggestions(sharedSuggestions);
  }, [sharedSuggestions]);

  useEffect(() => {
    if (!opened || !focusRequest) return;
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [opened, focusRequest]);

  useEffect(() => {
    if (!opened || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timeout = window.setTimeout(async () => {
      setLoadingSearch(true);
      setError(null);
      try {
        const response = await api.get("/search/smartSuggest", {
          params: { query: query.trim(), limit: 12 },
        });
        setSearchResults(
          (response.data.data ?? []).filter(
            (thing: IConnectable) => !includedIds.has(thing.id.toString())
          )
        );
      } catch {
        setSearchResults([]);
        setError("Search is unavailable right now. Try again in a moment.");
      } finally {
        setLoadingSearch(false);
      }
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [opened, query, includedIds]);

  const savePolicy = async (next: IRabbitholeRecommendationPolicy) => {
    setPolicy(next);
    setSavingPolicy(true);
    setError(null);
    try {
      await api.put(`/rabbitholes/${id}`, { recommendationPolicy: next });
      await loadSuggestions(true);
      onChanged();
    } catch {
      setPolicy(rabbithole.recommendationPolicy ?? defaultPolicy);
      setError(
        "The matching behavior could not be saved. Your previous settings are still active."
      );
    } finally {
      setSavingPolicy(false);
    }
  };

  const include = async (thingId: string) => {
    setWorkingId(thingId);
    setError(null);
    try {
      await api.post(`/rabbitholes/${id}/include`, { thingId });
      setSearchResults((current) => current.filter((thing) => thing.id.toString() !== thingId));
      onChanged();
    } catch {
      setError("That item could not be added. Nothing was changed.");
    } finally {
      setWorkingId(null);
    }
  };

  const accept = async (thingId: string) => {
    setWorkingId(thingId);
    setError(null);
    try {
      await api.post(`/rabbitholes/${id}/suggestions/${thingId}/accept`);
      setSuggestions((current) => {
        const next = current.filter((thing) => thing.id.toString() !== thingId);
        onSuggestionsChanged?.(next);
        return next;
      });
      onChanged();
    } catch {
      setError("That suggestion could not be added. Nothing was changed.");
    } finally {
      setWorkingId(null);
    }
  };

  const dismiss = async (thingId: string) => {
    setWorkingId(thingId);
    setError(null);
    try {
      await api.post(`/rabbitholes/${id}/suggestions/${thingId}/dismiss`);
      setSuggestions((current) => {
        const next = current.filter((thing) => thing.id.toString() !== thingId);
        onSuggestionsChanged?.(next);
        return next;
      });
    } catch {
      setError("That suggestion could not be dismissed. Try again.");
    } finally {
      setWorkingId(null);
    }
  };

  const undoAutoAdd = async (thingId: string) => {
    setWorkingId(thingId);
    setError(null);
    try {
      await api.post(`/rabbitholes/${id}/uninclude`, { thingId });
      setActivity((current) => current.filter((thing) => thing.id.toString() !== thingId));
      onChanged();
    } catch {
      setError("That automatic addition could not be undone.");
    } finally {
      setWorkingId(null);
    }
  };

  const displayed = query.trim().length >= 2 ? searchResults : suggestions;

  const content = (
    <Stack
      gap={variant === "panel" ? "md" : "lg"}
      className={variant === "panel" ? styles.panel : undefined}
    >
      <SearchBar
        ref={searchRef}
        query={query}
        setQuery={setQuery}
        loading={loadingSearch}
        onClear={() => setQuery("")}
        placeholder="Find something to include..."
        withinRabbithole
      />

      <PaperSegmentedControl
        className={styles.modeControl}
        fullWidth
        value={policy.mode}
        onChange={(value) => {
          const mode = value as IRabbitholeRecommendationPolicy["mode"];
          const currentModeDefault = getDefaultRabbitholeSimilarityThreshold(policy.mode);
          const threshold =
            Math.abs(policy.threshold - currentModeDefault) < 0.001
              ? getDefaultRabbitholeSimilarityThreshold(mode)
              : policy.threshold;
          void savePolicy({ ...policy, mode, threshold });
        }}
        data={[
          { label: "Suggest", value: "suggest" },
          { label: "Auto-add", value: "auto-add" },
        ]}
      />

      <div>
        <button
          type="button"
          className={styles.filtersToggle}
          aria-expanded={filtersOpened}
          onClick={() => setFiltersOpened((current) => !current)}
        >
          <span>
            Manage filters
            <Text component="span" size="xs" c="dimmed">
              {Math.round(policy.threshold * 100)}%
            </Text>
          </span>
          {savingPolicy ? (
            <Loader size="xs" />
          ) : (
            <CaretDownIcon className={filtersOpened ? styles.rotated : undefined} />
          )}
        </button>
        <Collapse in={filtersOpened}>
          <div className={styles.policy}>
            <Group justify="space-between">
              <div>
                <Text fw="bold" size="sm">
                  Semantic similarity
                </Text>
                <Text size="xs" c="dimmed">
                  Lower values surface broader possibilities; higher values require a closer match.
                </Text>
              </div>
              <Text size="sm" c="dimmed">
                {Math.round(policy.threshold * 100)}%
              </Text>
            </Group>
            <Slider
              mt="sm"
              min={
                policy.mode === "suggest" ? GLOBAL_SEMANTIC_SEARCH_THRESHOLD : 0.5
              }
              max={0.95}
              step={0.01}
              value={policy.threshold}
              onChange={(threshold) => setPolicy({ ...policy, threshold })}
              onChangeEnd={(threshold) => void savePolicy({ ...policy, threshold })}
              label={(value) => `${Math.round(value * 100)}%`}
            />
            <Text fw="bold" size="sm" mt="md">
              Content to consider
            </Text>
            <Group gap="xs" mt="xs">
              {connectableTypes.map((type) => (
                <PaperChip
                  key={type}
                  active={policy.types.includes(type)}
                  onClick={() => {
                    const types = policy.types.includes(type)
                      ? policy.types.filter((current) => current !== type)
                      : [...policy.types, type];
                    if (types.length) void savePolicy({ ...policy, types });
                  }}
                >
                  {type[0].toUpperCase() + type.slice(1)}s
                </PaperChip>
              ))}
            </Group>
          </div>
        </Collapse>
      </div>

      {error && (
        <Alert icon={<WarningCircleIcon />} color="red" title="Something got in the way">
          <Text size="sm">{error}</Text>
          <Button variant="subtle" size="compact-sm" mt="xs" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </Alert>
      )}

      <Group justify="space-between" align="flex-start">
        <Group gap="xs">
          <Text fw="bold">
            {query.trim().length >= 2
              ? "Search results"
              : policy.mode === "auto-add"
                ? "Recent activity"
                : "Suggestions"}
          </Text>
          <Tooltip
            label={
              policy.mode === "auto-add"
                ? "Review and undo items that were included automatically."
                : "Choose which matches become part of this workspace."
            }
            multiline
            w={220}
          >
            <InfoIcon size={14} color="var(--mantine-color-dimmed)" />
          </Tooltip>
        </Group>
        {loadingSuggestions && (
          <Group gap="xs">
            <Loader size="xs" />
            <Text size="xs" c="dimmed">
              Checking for matches…
            </Text>
          </Group>
        )}
      </Group>

      <Stack gap="xs">
        {!loadingSuggestions &&
          (query.trim().length >= 2
            ? displayed.length === 0
            : policy.mode === "auto-add"
              ? activity.length === 0
              : suggestions.length === 0) && (
            <Text c="dimmed" size="sm">
              {query.trim().length >= 2
                ? "No matching content."
                : policy.mode === "auto-add"
                  ? "No automatic additions yet."
                  : "No new suggestions right now."}
            </Text>
          )}
        {(query.trim().length >= 2
          ? displayed
          : policy.mode === "auto-add"
            ? activity
            : suggestions
        ).map((thing) => (
          <RecommendationRow
            key={thing.id.toString()}
            thing={thing}
            suggested={query.trim().length < 2 && policy.mode === "suggest"}
            activity={query.trim().length < 2 && policy.mode === "auto-add"}
            loading={workingId === thing.id.toString()}
            disabled={workingId !== null}
            onAdd={() =>
              policy.mode === "auto-add" && query.trim().length < 2
                ? void undoAutoAdd(thing.id.toString())
                : query.trim().length >= 2
                  ? void include(thing.id.toString())
                  : void accept(thing.id.toString())
            }
            onDismiss={() => void dismiss(thing.id.toString())}
          />
        ))}
      </Stack>
    </Stack>
  );

  if (variant === "panel") {
    return opened ? content : null;
  }

  return (
    <PaperDrawer title="Manage" opened={opened} onClose={onClose}>
      {content}
    </PaperDrawer>
  );
}

function RecommendationRow({
  thing,
  suggested,
  activity,
  onAdd,
  onDismiss,
  loading,
  disabled,
}: {
  thing: IConnectable | IRabbitholeSuggestion | IRabbitholeActivity;
  suggested: boolean;
  activity: boolean;
  onAdd: () => void;
  onDismiss: () => void;
  loading: boolean;
  disabled: boolean;
}) {
  const Icon = IconMap[thing.type];
  const suggestion = thing as IRabbitholeSuggestion & IRabbitholeActivity;
  const score = suggestion.recommendationScore ?? suggestion.inclusionSimilarity;
  const reason = suggestion.recommendationReason ?? suggestion.inclusionReason;
  const matchPercent = score ? Math.round(score * 100) : null;
  return (
    <div className={styles.recommendationRow}>
      <div className={styles.recommendationBody}>
        <Group gap="xs" wrap="nowrap" className={styles.recommendationMeta}>
          <Icon />
          <Text size="xs" fw="bold" tt="uppercase" c="dimmed">
            {thing.type}
          </Text>
          {matchPercent && (
            <Tooltip label={reason || "Similarity to this Rabbithole's context"} multiline w={240}>
              <Text className={styles.matchScore} size="xs" fw="bold">
                {matchPercent}%
              </Text>
            </Tooltip>
          )}
        </Group>

        <div className={styles.recommendationContent}>
          <Text fw="bold" size="sm" lineClamp={2}>
            {getNodeTitle(thing) || "Untitled"}
          </Text>
          <Text c="dimmed" size="xs" lineClamp={2} mt={2}>
            {getNodeDescription(thing) || "No description"}
          </Text>
        </div>
      </div>

      <div className={styles.recommendationActions}>
        {suggested && (
          <Tooltip label="Not relevant">
            <button
              type="button"
              className={styles.iconAction}
              onClick={onDismiss}
              disabled={disabled}
              aria-label={`Dismiss ${getNodeTitle(thing) || "suggestion"}`}
            >
              <XIcon weight="bold" size={16} />
            </button>
          </Tooltip>
        )}
        <Tooltip label={activity ? "Undo automatic addition" : "Add to Rabbithole"}>
          <button
            type="button"
            className={`${styles.iconAction} ${styles.primaryAction}`}
            onClick={onAdd}
            disabled={disabled}
            aria-label={
              activity
                ? `Undo automatic addition of ${getNodeTitle(thing) || "item"}`
                : `Add ${getNodeTitle(thing) || "item"} to Rabbithole`
            }
          >
            {loading ? (
              <Loader size="xs" />
            ) : activity ? (
              <ArrowCounterClockwiseIcon weight="bold" size={16} />
            ) : (
              <PlusIcon weight="bold" size={16} />
            )}
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
