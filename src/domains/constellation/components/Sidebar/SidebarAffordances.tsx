import type { ReactNode } from "react";
import { Loader, Text } from "@mantine/core";
import { WarningCircleIcon, type Icon } from "@phosphor-icons/react";
import PaperButton from "@core/design/components/Paper/PaperButton";
import type { SidebarAsyncState } from "./types";
import styles from "./ConstellationSidebar.module.scss";

interface SidebarSectionProps {
  id: string;
  title: string;
  icon?: Icon;
  children: ReactNode;
}

export function SidebarSection({ id, title, icon, children }: SidebarSectionProps) {
  const titleId = `${id}-title`;
  const SectionIcon = icon;

  return (
    <section aria-labelledby={titleId} className={styles.section}>
      <div className={styles.sectionTitle} id={titleId}>
        {SectionIcon && <SectionIcon aria-hidden size={14} weight="bold" />}
        <span>{title}</span>
      </div>
      {children}
    </section>
  );
}

export function SidebarState({ state }: { state?: SidebarAsyncState }) {
  if (!state || state.status === "idle") return null;

  if (state.status === "loading") {
    return (
      <div className={styles.state} role="status" aria-live="polite">
        <Loader size="xs" color="gray" />
        <Text size="xs" c="dimmed">
          {state.message ?? "Loading…"}
        </Text>
      </div>
    );
  }

  return (
    <div
      className={`${styles.state} ${state.status === "error" ? styles.stateError : ""}`}
      role={state.status === "error" ? "alert" : "status"}
    >
      {state.status === "error" && <WarningCircleIcon aria-hidden weight="bold" />}
      <Text size="xs" c={state.status === "error" ? "red.3" : "dimmed"}>
        {state.message}
      </Text>
    </div>
  );
}

interface BoundedListProps<T> {
  items: T[];
  limit: number;
  getKey: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  onShowAll?: () => void;
  showAllLabel?: string;
}

export function BoundedList<T>({
  items,
  limit,
  getKey,
  renderItem,
  onShowAll,
  showAllLabel = "Show all",
}: BoundedListProps<T>) {
  const visibleItems = items.slice(0, limit);
  const hiddenCount = Math.max(0, items.length - visibleItems.length);

  return (
    <div className={styles.boundedList}>
      <div className={styles.list}>
        {visibleItems.map((item, index) => (
          <div key={getKey(item)}>{renderItem(item, index)}</div>
        ))}
      </div>
      {hiddenCount > 0 && (
        <PaperButton onClick={onShowAll} disabled={!onShowAll} size="xs" variant="light" fullWidth>
          {showAllLabel} ({hiddenCount} more)
        </PaperButton>
      )}
    </div>
  );
}
