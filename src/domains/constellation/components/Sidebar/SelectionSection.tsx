import { Text, Tooltip } from "@mantine/core";
import { SelectionAllIcon } from "@phosphor-icons/react";
import PaperButton from "@core/design/components/Paper/PaperButton";
import PaperThing from "@core/design/components/Paper/Things/PaperThing";
import { SidebarState } from "./SidebarAffordances";
import type { SelectionSectionProps } from "./types";
import styles from "./ConstellationSidebar.module.scss";

export function SelectionSection({
  title = "Selection",
  items,
  provenance,
  onFocusItem,
  onClear,
  actions = [],
  actionContent,
  onExploreRelated,
  state,
}: SelectionSectionProps) {
  return (
    <section className={styles.workingSet} aria-labelledby="constellation-selection-title">
      <div className={styles.selectionBody}>
        {items.length === 0 && (!state || state.status === "idle") ? (
          <div className={styles.emptySelection} role="status">
            <SelectionAllIcon aria-hidden size={24} />
            <Text id="constellation-selection-title" size="sm" fw={650}>
              Build a working set
            </Text>
            <Text size="xs" c="dimmed">
              Select nodes in the graph, from search results, or from a traced path to act on them
              together.
            </Text>
          </div>
        ) : (
          <>
            <div className={styles.selectionHeader}>
              <div>
                <Text id="constellation-selection-title" size="sm" fw={650}>
                  {title}
                </Text>
                <Text size="xs" c="dimmed">
                  {items.length} {items.length === 1 ? "item" : "items"}
                </Text>
              </div>
            </div>

            {provenance && (
              <div className={styles.provenance}>
                <Text size="xs" fw={650}>
                  From {provenance.label}
                </Text>
                {provenance.detail && (
                  <Text size="xs" c="dimmed">
                    {provenance.detail}
                  </Text>
                )}
              </div>
            )}

            <div className={styles.selectionList} aria-label="Selected nodes">
              {items.map((item) => (
                <PaperThing
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  detail={item.detail || "No description provided"}
                  icon={item.icon}
                  link={item.link}
                  state="suggested"
                  className={styles.workingSetItem}
                  preventClickDefault
                  onClick={() => onFocusItem?.(item.id)}
                  contextActions={
                    onExploreRelated
                      ? [
                          {
                            id: "semantic-neighbors",
                            label: "Explore related nodes",
                            icon: SelectionAllIcon,
                            onClick: () => onExploreRelated(item.id),
                          },
                        ]
                      : undefined
                  }
                />
              ))}
            </div>
          </>
        )}

        <SidebarState state={state} />
      </div>

      {items.length > 0 && (
        <div className={styles.bulkActionBar} role="toolbar" aria-label="Working set actions">
          {actionContent}
          {!actionContent && actions.length > 0 && (
            <div className={styles.dispatch}>
              {actions.map((action) => {
                const ActionIcon = action.icon;
                const button = (
                  <PaperButton
                    size="xs"
                    withBorder
                    disabled={action.disabled}
                    loading={action.loading}
                    onClick={action.onClick}
                    leftSection={ActionIcon ? <ActionIcon aria-hidden weight="bold" /> : undefined}
                  >
                    {action.label}
                  </PaperButton>
                );

                return (
                  <div key={action.id} className={styles.bulkAction}>
                    {action.disabled && action.disabledReason ? (
                      <Tooltip label={action.disabledReason} multiline>
                        <span>{button}</span>
                      </Tooltip>
                    ) : (
                      button
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <PaperButton size="xs" variant="light" fullWidth disabled={!onClear} onClick={onClear}>
            Clear selection
          </PaperButton>
        </div>
      )}
    </section>
  );
}
