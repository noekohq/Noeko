import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import { useInteraction } from "../../../contexts/InteractionContext";
import { createPortal } from "react-dom";
import styles from "./Spotlight.module.scss";
import MiniSearch, { SearchResult } from "minisearch";
import {
  ArrowLeft,
  Gear,
  Graph,
  HouseSimple,
  Lightbulb,
  MagnifyingGlass,
  Scroll,
  Tag,
  User,
  IconProps,
  CaretLeft,
  Moon,
  Sun,
  TextAa, // Assuming Phosphor icons accept this
} from "@phosphor-icons/react";
import { userIsSuperuser } from "../../../utils/user"; // Kept if needed for actions
import { useAuth } from "../../../contexts/AuthContext"; // Kept if needed for actions
import { Text } from "@mantine/core";
import { useLayout } from "../../../contexts/LayoutContext";
import { useSettings } from "../../../contexts/SettingsContext";

// --- Type Definitions ---

export interface ISpotlightAction {
  id: string;
  title: string;
  icon: ReactNode;
  keywords?: string;
  action: () => void;
}

export interface ISpotlightSubviewLink {
  id: string;
  title: string;
  icon: ReactNode;
  keywords?: string;
  subviewId: string;
}

export type SpotlightMainItem = ISpotlightAction | ISpotlightSubviewLink;

export interface ISubviewDefinition {
  id: string;
  title?: string;
  placeholder?: string;
  items?: ISpotlightAction[];
  component?: (props: {
    searchText: string;
    closeSpotlight: () => void;
    triggerAction: (actionFn: () => void) => void;
  }) => ReactNode;
  onOpen?: (setSearchText: (text: string) => void) => void;
}

// --- MiniSearch Instance ---
// Define MiniSearch instance outside the component if its config is static
// Ensure storeFields covers all fields needed to reconstruct items from search results.
const minisearch = new MiniSearch<SpotlightMainItem | ISpotlightAction>({
  fields: ["title", "keywords"],
  storeFields: ["id", "title", "icon", "action", "subviewId", "keywords"], // Add all potential fields
  idField: "id",
});

export default function Spotlight() {
  const {
    state: { spotlightOpened },
    actions: {
      layout: {
        spotlight: { close: contextCloseSpotlight },
      },
      newIdea, // Example action
    },
    views: {
      // Example views/actions from context
      dashboard,
      graph: viewGraph, // Renamed to avoid conflict with icon
      spyglass,
      ideas,
      settings,
      profile,
      tags,
      updates,
    },
  } = useInteraction();

  const spotlightRef = useRef<HTMLInputElement>(null);
  const [spotlightValue, setSpotlightValue] = useState("");
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [currentSubviewId, setCurrentSubviewId] = useState<string | null>(null);
  const [displayedItems, setDisplayedItems] = useState<
    (SpotlightMainItem | ISpotlightAction)[]
  >([]);

  const { user } = useAuth(); // Kept if needed for actions
  const isSuperuser = userIsSuperuser(user); // Kept if needed for actions
  const { isMobile } = useLayout();
  const {
    ui: {
      theme: {
        scheme: { get: scheme, set: setScheme },
        bodyFont: { get: getBodyFont, set: setBodyFont },
      },
    },
  } = useSettings();

  // --- Close Spotlight Function (with subview reset) ---
  const closeSpotlightAndResetView = useCallback(() => {
    contextCloseSpotlight();
    setCurrentSubviewId(null);
    setSpotlightValue("");
    // activeItemIndex and displayedItems will be reset by other effects
  }, [contextCloseSpotlight]);

  // --- Data Definitions ---
  const mainSpotlightItems = useMemo<SpotlightMainItem[]>(
    () => [
      {
        id: "closeCmd",
        title: "Close Spotlight",
        icon: <ArrowLeft weight="bold" />,
        action: closeSpotlightAndResetView,
      },
      {
        id: "newIdeaCmd",
        title: "New Idea",
        icon: <Lightbulb weight="bold" />,
        action: () => {
          newIdea();
          closeSpotlightAndResetView();
        },
      },
      {
        id: "homeCmd",
        title: "Home",
        icon: <HouseSimple weight="bold" />,
        action: () => {
          dashboard();
          closeSpotlightAndResetView();
        },
      },
      {
        id: "graphCmd",
        title: "Graph View",
        icon: <Graph weight="bold" />,
        action: () => {
          viewGraph();
          closeSpotlightAndResetView();
        },
      },
      {
        id: "spyglassCmd",
        title: "Spyglass",
        icon: <MagnifyingGlass weight="bold" />,
        action: () => {
          spyglass();
          closeSpotlightAndResetView();
        },
      },
      {
        id: "ideasCmd",
        title: "Ideas List",
        icon: <Lightbulb weight="bold" />,
        action: () => {
          ideas();
          closeSpotlightAndResetView();
        },
      },
      {
        id: "tagsCmd",
        title: "Tags",
        icon: <Tag weight="bold" />,
        action: () => {
          tags();
          closeSpotlightAndResetView();
        },
      },
      {
        id: "updatesCmd",
        title: "Updates",
        icon: <Scroll weight="bold" />,
        action: () => {
          updates();
          closeSpotlightAndResetView();
        },
      },
      {
        id: "settingsCmd",
        title: "Settings",
        icon: <Gear weight="bold" />,
        action: () => {
          settings();
          closeSpotlightAndResetView();
        },
      },
      {
        id: "profileCmd",
        title: "Profile",
        icon: <User weight="bold" />,
        action: () => {
          profile();
          closeSpotlightAndResetView();
        },
      },
      {
        id: "themeCmd",
        title: "Theme",
        icon: <Sun weight="bold" />,
        subviewId: "themeSelectorSubview",
        keywords: "light dark",
      },
      {
        id: "fontCmd",
        title: "Font",
        icon: <TextAa weight="bold" />,
        subviewId: "fontSelectorSubview",
        keywords: "serif sans-serif",
      },
    ],
    [
      closeSpotlightAndResetView,
      newIdea,
      dashboard,
      viewGraph,
      spyglass,
      ideas,
      tags,
      updates,
      settings,
      profile,
    ],
  );

  const subviewDefinitions = useMemo<Map<string, ISubviewDefinition>>(
    () =>
      new Map([
        [
          "themeSelectorSubview",
          {
            id: "themeSelectorSubview",
            title: "Theme Selector",
            placeholder: "Select a theme...",
            items: [
              {
                id: "light",
                title: "Light Theme",
                icon: <Sun weight="bold" />,
                action: () => {
                  setScheme("light");
                },
              },
              {
                id: "dark",
                title: "Dark Theme",
                icon: <Moon weight="bold" />,
                action: () => {
                  setScheme("dark");
                },
              },
            ],
            onOpen: (setSearchText) => {},
          },
        ],
        [
          "fontSelectorSubview",
          {
            id: "fontSelectorSubview",
            title: "Font Selector",
            placeholder: "Select a font...",
            items: [
              {
                id: "sans-serif",
                title: "Sans Serif",
                icon: <TextAa weight="bold" />,
                action: () => {
                  setBodyFont("sans-serif");
                },
              },
              {
                id: "serif",
                title: "Serif",
                icon: <TextAa weight="bold" />,
                action: () => {
                  setBodyFont("serif");
                },
              },
            ],
            onOpen: (setSearchText) => {},
          },
        ],
      ]),
    [],
  );

  // --- Effect for Re-indexing MiniSearch ---
  useEffect(() => {
    minisearch.removeAll();
    let itemsToIndex: (SpotlightMainItem | ISpotlightAction)[] = [];

    if (currentSubviewId) {
      const subview = subviewDefinitions.get(currentSubviewId);
      if (subview?.items) {
        itemsToIndex = subview.items;
      }
      // If subview.component, itemsToIndex remains empty for list display purposes.
    } else {
      itemsToIndex = mainSpotlightItems;
    }

    if (itemsToIndex.length > 0) {
      minisearch.addAll(itemsToIndex);
    }
    // Trigger search with current spotlightValue after re-indexing
    // This is handled by the next useEffect which depends on currentSubviewId
  }, [currentSubviewId, mainSpotlightItems, subviewDefinitions]);

  // --- Effect for Searching ---
  useEffect(() => {
    setActiveItemIndex(0); // Reset selection when search text or view changes

    if (currentSubviewId) {
      const subview = subviewDefinitions.get(currentSubviewId);
      if (subview?.component) {
        setDisplayedItems([]); // Custom component handles its own rendering
        return;
      }
    }

    let currentPool: (SpotlightMainItem | ISpotlightAction)[] = [];
    if (currentSubviewId) {
      const subview = subviewDefinitions.get(currentSubviewId);
      currentPool = subview?.items || [];
    } else {
      currentPool = mainSpotlightItems;
    }

    if (!spotlightValue) {
      setDisplayedItems(currentPool);
    } else {
      if (currentPool.length === 0 && !currentSubviewId) {
        // Should not happen if mainSpotlightItems is populated
        setDisplayedItems([]);
      } else if (
        currentPool.length === 0 &&
        currentSubviewId &&
        !subviewDefinitions.get(currentSubviewId)?.component
      ) {
        setDisplayedItems([]); // Empty item list for a list-based subview
      } else {
        // Minisearch is already indexed by the previous effect for the current view
        const searchResults = minisearch.search(spotlightValue, {
          fuzzy: 0.2, // Adjusted fuzzy slightly
          prefix: true,
        });
        // Results from minisearch are the full items due to storeFields
        setDisplayedItems(
          searchResults as unknown as (SpotlightMainItem | ISpotlightAction)[],
        );
      }
    }
  }, [
    spotlightValue,
    currentSubviewId,
    mainSpotlightItems,
    subviewDefinitions,
  ]);

  useEffect(() => {
    if (spotlightOpened) {
      setSpotlightValue("");
      setCurrentSubviewId(null);
      spotlightRef.current?.focus();
    }
  }, [spotlightOpened]);

  // --- Handle Item Selection (Unified Logic) ---
  const handleItemSelection = useCallback(
    (item: SpotlightMainItem | ISpotlightAction) => {
      if (!item) return;

      if ("subviewId" in item && item.subviewId) {
        // It's a SpotlightMainItem opening a subview
        setCurrentSubviewId(item.subviewId);
        setSpotlightValue(""); // Clear search for the new subview
        spotlightRef.current?.focus();
        const subviewDef = subviewDefinitions.get(item.subviewId);
        subviewDef?.onOpen?.(setSpotlightValue);
      } else if ("action" in item && typeof item.action === "function") {
        // It's an action item
        item.action(); // This will call closeSpotlightAndResetView if defined in the action
        // or newIdea(), then closeSpotlightAndResetView() etc.
        // If actions don't inherently call closeSpotlightAndResetView, call it here:
        // if (!item.action.toString().includes('closeSpotlightAndResetView')) {
        //    closeSpotlightAndResetView();
        // }
        // For simplicity, assuming actions defined in mainSpotlightItems already handle closing.
        // Subview items' actions will also typically lead to closing.
      }
    },
    [subviewDefinitions, closeSpotlightAndResetView],
  ); // Added closeSpotlightAndResetView if needed

  // --- Keyboard Navigation ---
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!spotlightOpened) return;

      const currentItemsCount = displayedItems.length;
      const currentActiveSubview = currentSubviewId
        ? subviewDefinitions.get(currentSubviewId)
        : null;
      const isCustomComponentView =
        currentActiveSubview && currentActiveSubview.component;

      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (!isCustomComponentView) {
          setActiveItemIndex((prev) => Math.max(0, prev - 1));
        }
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!isCustomComponentView && currentItemsCount > 0) {
          setActiveItemIndex((prev) =>
            Math.min(currentItemsCount - 1, prev + 1),
          );
        }
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (!isCustomComponentView && displayedItems[activeItemIndex]) {
          handleItemSelection(displayedItems[activeItemIndex]);
        }
        // If it's a custom component view, Enter might be handled by the input or the component itself.
      } else if (event.key === "Escape") {
        event.preventDefault();
        if (currentSubviewId) {
          setCurrentSubviewId(null);
          setSpotlightValue("");
          spotlightRef.current?.focus();
        } else {
          closeSpotlightAndResetView();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    spotlightOpened,
    displayedItems,
    activeItemIndex,
    currentSubviewId,
    handleItemSelection,
    closeSpotlightAndResetView,
    subviewDefinitions,
  ]);

  // --- Dynamic Placeholder ---
  const currentPlaceholder = useMemo(() => {
    if (currentSubviewId) {
      return (
        subviewDefinitions.get(currentSubviewId)?.placeholder ||
        `Search in ${subviewDefinitions.get(currentSubviewId)?.title || "subview"}...`
      );
    }
    return "Search for anything...";
  }, [currentSubviewId, subviewDefinitions]);

  const currentTitle = useMemo(() => {
    if (currentSubviewId) {
      return subviewDefinitions.get(currentSubviewId)?.title;
    }
    return null;
  }, [currentSubviewId, subviewDefinitions]);

  if (!spotlightOpened) {
    return null;
  }

  const currentActiveSubviewDef = currentSubviewId
    ? subviewDefinitions.get(currentSubviewId)
    : null;

  return createPortal(
    <div
      className={styles.spotlightOverlay}
      onClick={closeSpotlightAndResetView}
    >
      <div className={styles.tipText}>
        <Text>
          {isMobile && !currentSubviewId
            ? "Tap anywhere to close."
            : isMobile && currentSubviewId
              ? "Tap overlay to go back."
              : currentTitle
                ? currentTitle
                : "Find anything..."}
        </Text>
      </div>
      <div className={styles.spotlight} onClick={(e) => e.stopPropagation()}>
        {currentSubviewId && (
          <button
            className={styles.backButton}
            onClick={() => {
              setCurrentSubviewId(null);
              setSpotlightValue("");
              spotlightRef.current?.focus();
            }}
            title="Go back to main search"
          >
            <CaretLeft weight="bold" />
          </button>
        )}
        <input
          className={`${styles.input} ${currentSubviewId ? styles.inputWithBackButton : ""}`}
          type="text"
          value={spotlightValue}
          onChange={(e) => setSpotlightValue(e.target.value)}
          ref={spotlightRef}
          placeholder={currentPlaceholder}
        />
        <div className={styles.resultsContainer}>
          {currentActiveSubviewDef?.component ? (
            currentActiveSubviewDef.component({
              searchText: spotlightValue,
              closeSpotlight: closeSpotlightAndResetView,
              triggerAction: (actionFn) => {
                actionFn();
                closeSpotlightAndResetView();
              },
            })
          ) : displayedItems.length > 0 ? (
            <div className={styles.results}>
              {displayedItems.map((item, i) => (
                <Option
                  key={item.id + i} // Ensure unique keys if IDs can repeat (they shouldn't with this model)
                  icon={item.icon}
                  title={item.title}
                  active={i === activeItemIndex}
                  setActive={() => setActiveItemIndex(i)}
                  onClick={() => handleItemSelection(item)}
                />
              ))}
            </div>
          ) : (
            <div className={styles.noResults}>
              {spotlightValue ? "No results found" : "Type to search..."}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// --- Option Sub-component (largely unchanged) ---
type IOptionProps = {
  icon: React.ReactNode;
  title: string;
  active: boolean;
  setActive: () => void;
  onClick: () => void;
};

function Option({ icon, title, active, setActive, onClick }: IOptionProps) {
  const optionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active) {
      optionRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [active]);

  return (
    <div
      ref={optionRef}
      className={`${styles.result} ${active ? styles.active : ""}`}
      onMouseEnter={setActive} // Simplified direct call
      onClick={onClick}
    >
      <div className={styles.icon}>{icon}</div>
      <div className={styles.title}>{title}</div>
    </div>
  );
}
