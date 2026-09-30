import { Group, Text } from "@mantine/core";
import { MapTrifoldIcon, XIcon } from "@phosphor-icons/react";
import PaperButton from "@core/design/components/Paper/PaperButton";
import PaperChip from "@core/design/components/Paper/PaperChip";
import PaperSegmentedControl from "@core/design/components/Paper/PaperSegmentedControl";
import { SidebarSection, SidebarState } from "./SidebarAffordances";
import type { LandscapeSectionProps } from "./types";
import styles from "./ConstellationSidebar.module.scss";

export function LandscapePerspectiveControl({
  perspective,
  perspectiveLabel,
  onPerspectiveChange,
}: Pick<LandscapeSectionProps, "perspective" | "perspectiveLabel" | "onPerspectiveChange">) {
  return (
    <section
      className={styles.perspectiveControl}
      aria-labelledby="constellation-perspective-title"
    >
      <Text id="constellation-perspective-title" size="xs" c="dimmed" fw={650}>
        Perspective{perspectiveLabel ? ` · ${perspectiveLabel}` : ""}
      </Text>
      <PaperSegmentedControl
        fullWidth
        size="xs"
        value={perspective}
        onChange={(value) => onPerspectiveChange?.(value as LandscapeSectionProps["perspective"])}
        data={[
          { value: "mine", label: "Mine" },
          { value: "friend", label: "Friend" },
          { value: "organization", label: "Organization" },
        ]}
        aria-label="Knowledge landscape perspective"
      />
    </section>
  );
}

export function LandscapeSection({
  perspective,
  filters = [],
  onRemoveFilter,
  nodeCount,
  relationshipCount,
  onReset,
  state,
  notices = [],
  controls,
}: LandscapeSectionProps) {
  const visibleFilters = filters.filter((filter) => filter.id !== "shared");

  return (
    <SidebarSection id="constellation-landscape" title="Landscape" icon={MapTrifoldIcon}>
      <div className={styles.stack}>
        <div className={styles.counts} aria-label="Landscape summary">
          <div>
            <strong>{nodeCount}</strong>
            <span>nodes</span>
          </div>
          <div>
            <strong>{relationshipCount}</strong>
            <span>relationships</span>
          </div>
          <div>
            <strong>{filters.length}</strong>
            <span>filters</span>
          </div>
        </div>

        {controls}

        {visibleFilters.length > 0 && (
          <div className={styles.field}>
            <Text size="xs" c="dimmed" fw={650}>
              Active scope
            </Text>
            <Group gap="xs" wrap="wrap">
              {visibleFilters.map((filter) => (
                <PaperChip
                  key={filter.id}
                  active
                  size="compact"
                  disabled={!onRemoveFilter}
                  onClick={() => onRemoveFilter?.(filter.id)}
                >
                  <span>{filter.label}</span>
                  {onRemoveFilter && <XIcon aria-hidden size={12} weight="bold" />}
                  {onRemoveFilter && <span className={styles.srOnly}>Remove filter</span>}
                </PaperChip>
              ))}
            </Group>
          </div>
        )}

        {notices.map((notice) => (
          <div
            key={notice.id}
            className={`${styles.notice} ${styles[`notice_${notice.tone ?? "info"}`]}`}
            role={notice.tone === "error" ? "alert" : "status"}
          >
            {notice.message}
          </div>
        ))}

        <SidebarState state={state} />

        <PaperButton
          variant="light"
          size="xs"
          fullWidth
          disabled={!onReset || (filters.length === 0 && perspective === "mine")}
          onClick={onReset}
        >
          Reset landscape
        </PaperButton>
      </div>
    </SidebarSection>
  );
}
