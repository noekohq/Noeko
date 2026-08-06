import type { FormEvent } from "react";
import { Text } from "@mantine/core";
import {
  ArrowsLeftRightIcon,
  BinocularsIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  PathIcon,
  SparkleIcon,
  TextTIcon,
} from "@phosphor-icons/react";
import PaperButton from "@core/design/components/Paper/PaperButton";
import PaperChip from "@core/design/components/Paper/PaperChip";
import PaperInput from "@core/design/components/Paper/PaperInput";
import PaperSearchResult from "@core/design/components/Paper/PaperSearchResult/PaperSearchResult";
import { BoundedList, SidebarSection, SidebarState } from "./SidebarAffordances";
import type { FindAndTraceSectionProps, FindTraceResult, TraceEvidence } from "./types";
import styles from "./ConstellationSidebar.module.scss";

const evidencePresentation: Record<TraceEvidence, { label: string; icon: typeof TextTIcon }> = {
  text: { label: "Text match", icon: TextTIcon },
  semantic: { label: "Semantic", icon: SparkleIcon },
  connection: { label: "Connected", icon: LinkIcon },
  spyglass: { label: "Spyglass path", icon: PathIcon },
};

function getArtifacts(result: FindTraceResult) {
  const evidence = evidencePresentation[result.evidence];
  const artifacts = [{ icon: evidence.icon, label: evidence.label }];

  if (typeof result.similarity === "number") {
    artifacts.push({
      icon: ArrowsLeftRightIcon,
      label: `${Math.round(result.similarity * 100)}% similar`,
    });
  }
  if (typeof result.pathStep === "number") {
    artifacts.push({ icon: PathIcon, label: `Step ${result.pathStep}` });
  }

  return artifacts;
}

export function FindAndTraceSection({
  query,
  onQueryChange,
  onSearch,
  results = [],
  resultLimit = 6,
  resultState,
  onResultSelect,
  onShowAllResults,
  semanticLensActive = false,
  semanticTargetTitle,
  onSemanticLensChange,
  onStartTrace,
  onUseResultsAsSelection,
}: FindAndTraceSectionProps) {
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    onSearch?.(query);
  };

  return (
    <SidebarSection id="constellation-find-trace" title="Find and trace" icon={BinocularsIcon}>
      <div className={styles.stack}>
        <form onSubmit={submitSearch} className={styles.searchForm} role="search">
          <PaperInput
            value={query}
            onChange={(event) => onQueryChange(event.currentTarget.value)}
            placeholder="Find a node or topic"
            aria-label="Find a node or topic"
            leftSection={<MagnifyingGlassIcon aria-hidden size={16} />}
          />
          <PaperButton size="sm" disabled={!onSearch || !query.trim()}>
            Find
          </PaperButton>
        </form>

        <div className={styles.searchTools}>
          {(semanticLensActive || semanticTargetTitle) && (
            <PaperChip
              active={semanticLensActive}
              disabled={!onSemanticLensChange}
              onClick={() => onSemanticLensChange?.(!semanticLensActive)}
              size="compact"
            >
              <SparkleIcon aria-hidden size={14} weight="bold" />
              {semanticLensActive
                ? "Semantic neighbors on"
                : `Explore neighbors of ${semanticTargetTitle}`}
            </PaperChip>
          )}
          <PaperButton
            variant="light"
            size="xs"
            disabled={!onStartTrace || !query.trim()}
            onClick={() => onStartTrace?.(query)}
            leftSection={<PathIcon aria-hidden weight="bold" />}
          >
            Trace in Spyglass
          </PaperButton>
        </div>

        <SidebarState state={resultState} />

        {results.length > 0 && (
          <div className={styles.results} aria-label="Find and trace results">
            <Text size="xs" c="dimmed" fw={650}>
              Results · {results.length}
            </Text>
            <BoundedList
              items={results}
              limit={resultLimit}
              getKey={(result) =>
                `${result.node.id.toString()}-${result.pathStep ?? result.evidence}`
              }
              onShowAll={onShowAllResults}
              showAllLabel="Show all results"
              renderItem={(result) => (
                <div className={styles.traceResult}>
                  <PaperSearchResult
                    node={result.node}
                    title={result.title}
                    snippet={result.snippet}
                    artifacts={getArtifacts(result)}
                    onSelect={() => onResultSelect?.(result)}
                  />
                  {result.explanation && (
                    <Text size="xs" c="dimmed" className={styles.explanation}>
                      {result.explanation}
                    </Text>
                  )}
                </div>
              )}
            />
            <PaperButton
              fullWidth
              size="xs"
              withBorder
              disabled={!onUseResultsAsSelection}
              onClick={() => onUseResultsAsSelection?.(results)}
            >
              Use results as selection
            </PaperButton>
          </div>
        )}
      </div>
    </SidebarSection>
  );
}
