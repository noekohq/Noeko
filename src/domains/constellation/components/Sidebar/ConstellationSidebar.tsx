import { useState } from "react";
import type { ConstellationSidebarProps } from "./types";
import { LandscapePerspectiveControl, LandscapeSection } from "./LandscapeSection";
import { PerspectiveDetailsSection } from "./PerspectiveDetailsSection";
import { SelectionSection } from "./SelectionSection";
import styles from "./ConstellationSidebar.module.scss";

type ConstellationSidebarTab = "explore" | "working-set";

export function ConstellationSidebar({
  landscape,
  selection,
  perspectiveDetails,
  className,
}: ConstellationSidebarProps) {
  const [activeTab, setActiveTab] = useState<ConstellationSidebarTab>("explore");
  const selectionCount = selection.items.length;

  return (
    <aside
      className={[styles.sidebar, className].filter(Boolean).join(" ")}
      aria-label="Constellation controls"
    >
      <div className={styles.tabs} role="tablist" aria-label="Constellation sidebar views">
        <button
          type="button"
          id="constellation-explore-tab"
          role="tab"
          aria-selected={activeTab === "explore"}
          aria-controls="constellation-explore-panel"
          className={`${styles.tab} ${activeTab === "explore" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("explore")}
        >
          Explore
        </button>
        <button
          type="button"
          id="constellation-working-set-tab"
          role="tab"
          aria-selected={activeTab === "working-set"}
          aria-controls="constellation-working-set-panel"
          className={`${styles.tab} ${activeTab === "working-set" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("working-set")}
        >
          <span>Working Set</span>
          <span className={styles.tabBadge} aria-label={`${selectionCount} selected`}>
            {selectionCount}
          </span>
        </button>
      </div>

      {activeTab === "explore" && (
        <div
          id="constellation-explore-panel"
          role="tabpanel"
          aria-labelledby="constellation-explore-tab"
          className={styles.tabPanel}
        >
          {landscape.onPerspectiveChange && <LandscapePerspectiveControl {...landscape} />}
          <LandscapeSection {...landscape} />
          {perspectiveDetails && <PerspectiveDetailsSection {...perspectiveDetails} />}
        </div>
      )}

      {activeTab === "working-set" && (
        <div
          id="constellation-working-set-panel"
          role="tabpanel"
          aria-labelledby="constellation-working-set-tab"
          className={`${styles.tabPanel} ${styles.workingSetPanel}`}
        >
          <SelectionSection {...selection} />
        </div>
      )}
    </aside>
  );
}
