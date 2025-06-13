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
import MiniSearch from "minisearch";
import {
  ArrowLeftIcon,
  GearIcon,
  GraphIcon,
  HouseSimpleIcon,
  LightbulbIcon,
  MagnifyingGlassIcon,
  ScrollIcon,
  TagIcon,
  UserIcon,
  CaretLeftIcon,
  MoonIcon,
  SunIcon,
  TextAaIcon,
} from "@phosphor-icons/react";
import { userIsSuperuser } from "../../../utils/user";
import { useAuth } from "../../../contexts/AuthContext";
import { Text } from "@mantine/core";
import { useLayout } from "../../../contexts/LayoutContext";
import { useSettings } from "../../../contexts/SettingsContext";
import { useNavigate } from "react-router";
import { api } from "../../../server/api";
import type { IIdea } from "../../../../app/database/models/ideas";
import { Option } from "./Option";
import type {
  ISubviewDefinition,
  IUnifiedSearchItem,
  SpotlightMainItem,
} from "./spotlight.d";
import { getNodeDescription } from "../../../utils/graph";

const minisearch = new MiniSearch<IUnifiedSearchItem>({
  fields: ["title", "keywords"],
  storeFields: ["id", "title", "displayTitle", "icon", "action", "isTopLevel"],
  idField: "id",
});

const createDisplayTitle = (parentTitle: string, childTitle: string) => (
  <>
    <span className={styles.parent}>{parentTitle}</span>
    <span className={styles.separator}> → </span>
    <span>{childTitle}</span>
  </>
);

async function fetchSuggestedIdeas(query: string): Promise<IIdea[]> {
  try {
    const response = await api.get(`/search/ideas/suggest?query=${query}`);
    return response.data.data as IIdea[];
  } catch (error) {
    console.error(error);
    return [];
  }
}

export default function Spotlight() {
  const navigate = useNavigate();
  const {
    state: { spotlightOpened },
    actions: {
      layout: {
        spotlight: { close: contextCloseSpotlight },
      },
      newIdea,
    },
    views: {
      dashboard,
      graph: viewGraph,
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
  const [displayedItems, setDisplayedItems] = useState<IUnifiedSearchItem[]>(
    [],
  );

  const { user } = useAuth();
  const isSuperuser = userIsSuperuser(user);
  const { isMobile } = useLayout();
  const {
    ui: {
      theme: {
        scheme: { set: setScheme },
        bodyFont: { set: setBodyFont },
      },
    },
  } = useSettings();

  const closeSpotlightAndResetView = useCallback(() => {
    contextCloseSpotlight();
    setCurrentSubviewId(null);
    setSpotlightValue("");
  }, [contextCloseSpotlight]);

  const mainSpotlightItems = useMemo<SpotlightMainItem[]>(
    () => [
      {
        id: "closeCmd",
        title: "Close",
        icon: <ArrowLeftIcon />,
        action: closeSpotlightAndResetView,
      },
      {
        id: "ideaSwitcher",
        title: "Find idea",
        subviewId: "ideaSwitcherSubview",
        icon: <MagnifyingGlassIcon />,
      },
      {
        id: "ideas",
        title: "Ideas",
        icon: <LightbulbIcon />,
        subviewId: "ideasSubview",
      },
      {
        id: "homeCmd",
        title: "Home",
        icon: <HouseSimpleIcon />,
        action: () => {
          dashboard();
          closeSpotlightAndResetView();
        },
      },
      {
        id: "graphCmd",
        title: "Graph View",
        icon: <GraphIcon />,
        action: () => {
          viewGraph();
          closeSpotlightAndResetView();
        },
      },
      {
        id: "spyglassCmd",
        title: "Spyglass",
        icon: <MagnifyingGlassIcon />,
        action: () => {
          spyglass();
          closeSpotlightAndResetView();
        },
      },
      {
        id: "tagsCmd",
        title: "Tags",
        icon: <TagIcon />,
        action: () => {
          tags();
          closeSpotlightAndResetView();
        },
      },
      {
        id: "updatesCmd",
        title: "Updates",
        icon: <ScrollIcon />,
        action: () => {
          updates();
          closeSpotlightAndResetView();
        },
      },
      {
        id: "settingsCmd",
        title: "Settings",
        icon: <GearIcon />,
        action: () => {
          settings();
          closeSpotlightAndResetView();
        },
      },
      {
        id: "profileCmd",
        title: "Profile",
        icon: <UserIcon />,
        action: () => {
          profile();
          closeSpotlightAndResetView();
        },
      },
      {
        id: "themeCmd",
        title: "Theme",
        icon: <SunIcon />,
        subviewId: "themeSelectorSubview",
        keywords: "light dark",
      },
      {
        id: "fontCmd",
        title: "Font",
        icon: <TextAaIcon />,
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
            title: "Theme",
            items: [
              {
                id: "light",
                title: "Light",
                icon: <SunIcon />,
                action: (close) => {
                  setScheme("light");
                  close();
                },
              },
              {
                id: "dark",
                title: "Dark",
                icon: <MoonIcon />,
                action: (close) => {
                  setScheme("dark");
                  close();
                },
              },
            ],
          },
        ],
        [
          "fontSelectorSubview",
          {
            id: "fontSelectorSubview",
            title: "Font",
            items: [
              {
                id: "sans-serif",
                title: "Sans Serif",
                icon: <TextAaIcon />,
                action: (close) => {
                  setBodyFont("sans-serif");
                  close();
                },
              },
              {
                id: "serif",
                title: "Serif",
                icon: <TextAaIcon />,
                action: (close) => {
                  setBodyFont("serif");
                  close();
                },
              },
            ],
          },
        ],
        [
          "ideasSubview",
          {
            id: "ideas",
            title: "Ideas",
            items: [
              {
                id: "newIdeaCmd",
                title: "New Idea",
                icon: <LightbulbIcon />,
                action: () => {
                  newIdea();
                  closeSpotlightAndResetView();
                },
              },
              {
                id: "ideasCmd",
                title: "Ideas List",
                icon: <LightbulbIcon />,
                action: () => {
                  ideas();
                  closeSpotlightAndResetView();
                },
              },
            ],
          },
        ],
        [
          "ideaSwitcherSubview",
          {
            id: "ideaSwitcherSubview",
            title: "Idea Switcher",
            placeholder: "Search for an idea to switch to...",
            dynamicItems: async ({ searchText, closeSpotlight }) => {
              const suggestedItems = await fetchSuggestedIdeas(searchText);

              return suggestedItems.map((idea) => ({
                id: idea.id.toString(),
                title: idea.title,
                description: getNodeDescription(
                  {
                    ...idea,
                    type: "idea",
                  },
                  {
                    sentences: 1,
                    maxLength: 256,
                  },
                ),
                icon: <LightbulbIcon />,
                action: () => {
                  navigate(`/idea/${idea.id}`);
                  closeSpotlight();
                },
              }));
            },
          },
        ],
      ]),
    [setScheme, setBodyFont],
  );

  const unifiedSearchItems = useMemo<IUnifiedSearchItem[]>(() => {
    const items: IUnifiedSearchItem[] = [];

    mainSpotlightItems.forEach((item) => {
      if ("subviewId" in item) {
        const subview = subviewDefinitions.get(item.subviewId);

        items.push({
          id: item.id,
          title: item.title,
          displayTitle: item.title,
          icon: item.icon,
          keywords: item.keywords,
          action: () => {
            setCurrentSubviewId(item.subviewId);
            setSpotlightValue("");
          },
          isTopLevel: true,
        });

        if (subview?.items) {
          subview.items.forEach((subItem) => {
            items.push({
              id: `${item.id}:${subItem.id}`,
              title: subItem.title,
              displayTitle: createDisplayTitle(item.title, subItem.title),
              icon: subItem.icon,
              keywords: `${item.title} ${item.keywords || ""} ${subItem.keywords || ""}`,
              action: () => subItem.action(closeSpotlightAndResetView),
              isTopLevel: false,
            });
          });
        }
      } else if ("action" in item) {
        items.push({
          ...item,
          displayTitle: item.title,
          action: item.action,
          isTopLevel: true,
        });
      }
    });

    return items;
  }, [mainSpotlightItems, subviewDefinitions, closeSpotlightAndResetView]);

  useEffect(() => {
    minisearch.removeAll();
    minisearch.addAll(unifiedSearchItems);
  }, [unifiedSearchItems]);

  useEffect(() => {
    setActiveItemIndex(0);

    if (currentSubviewId) {
      const subview = subviewDefinitions.get(currentSubviewId);

      if (subview?.component) {
        setDisplayedItems([]);
        return;
      }

      if (subview?.dynamicItems) {
        subview
          .dynamicItems({
            searchText: spotlightValue,
            closeSpotlight: closeSpotlightAndResetView,
          })
          .then((actions) => {
            setDisplayedItems(
              actions.map((item) => ({
                ...item,
                displayTitle: item.title,
                displayDescription: item.description,
                isTopLevel: false,
              })),
            );
          });
        return;
      }

      if (subview?.items) {
        const itemsInSubview = subview.items.map((subItem) => ({
          id: `${subview.id}:${subItem.id}`,
          title: subItem.title,
          displayTitle: subItem.title,
          icon: subItem.icon,
          keywords: subItem.keywords,
          action: () => subItem.action(closeSpotlightAndResetView),
          isTopLevel: false,
        }));

        if (spotlightValue) {
          const lowerCaseQuery = spotlightValue.toLowerCase();
          const filtered = itemsInSubview.filter(
            (item) =>
              item.title.toLowerCase().includes(lowerCaseQuery) ||
              item.keywords?.toLowerCase().includes(lowerCaseQuery),
          );
          setDisplayedItems(filtered);
        } else {
          setDisplayedItems(itemsInSubview);
        }
        return;
      }
    }

    // --- Handle Global Search (no subview active) ---
    if (!spotlightValue) {
      // Show only top-level items on initial view
      setDisplayedItems(unifiedSearchItems.filter((item) => item.isTopLevel));
    } else {
      const searchResults = minisearch.search(spotlightValue, {
        fuzzy: 0.2,
        prefix: true,
      });
      setDisplayedItems(searchResults as unknown as IUnifiedSearchItem[]);
    }
  }, [
    spotlightValue,
    unifiedSearchItems,
    currentSubviewId,
    subviewDefinitions,
    closeSpotlightAndResetView, // Added dependency
  ]);

  // --- Effect to Focus Input when Opened ---
  useEffect(() => {
    if (spotlightOpened) {
      setSpotlightValue("");
      setCurrentSubviewId(null); // Reset to main view on open
      spotlightRef.current?.focus();
    }
  }, [spotlightOpened]);

  // --- Keyboard Navigation ---
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!spotlightOpened) return;

      const isCustomComponentView =
        currentSubviewId && subviewDefinitions.get(currentSubviewId)?.component;

      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (!isCustomComponentView) {
          setActiveItemIndex((prev) => Math.max(0, prev - 1));
        }
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!isCustomComponentView && displayedItems.length > 0) {
          setActiveItemIndex((prev) =>
            Math.min(displayedItems.length - 1, prev + 1),
          );
        }
      } else if (event.key === "Enter") {
        event.preventDefault();
        const selectedItem = displayedItems[activeItemIndex];
        if (!isCustomComponentView && selectedItem) {
          selectedItem.action();
        }
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
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    spotlightOpened,
    displayedItems,
    activeItemIndex,
    currentSubviewId,
    closeSpotlightAndResetView,
    subviewDefinitions,
  ]);

  // --- Dynamic Placeholder & Title ---
  const currentSubviewDef = currentSubviewId
    ? subviewDefinitions.get(currentSubviewId)
    : null;
  const currentPlaceholder =
    currentSubviewDef?.placeholder || "Search or type a command...";
  const currentTitle = currentSubviewDef?.title;

  if (!spotlightOpened) return null;

  return createPortal(
    <div
      className={styles.spotlightOverlay}
      onClick={closeSpotlightAndResetView}
    >
      <div className={styles.tipText}>
        <Text>
          {isMobile
            ? "Tap anywhere to close."
            : currentTitle || "Find anything..."}
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
            <CaretLeftIcon weight="bold" />
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
          {currentSubviewDef?.component ? (
            currentSubviewDef.component({
              searchText: spotlightValue,
              closeSpotlight: closeSpotlightAndResetView,
            })
          ) : displayedItems.length > 0 ? (
            <div className={styles.results}>
              {displayedItems.map((item, i) => (
                <Option
                  key={item.id}
                  icon={item.icon}
                  title={item.displayTitle} // Use the rich displayTitle
                  description={item.displayDescription}
                  active={i === activeItemIndex}
                  setActive={() => setActiveItemIndex(i)}
                  onClick={item.action} // Action is now always a direct function call
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
