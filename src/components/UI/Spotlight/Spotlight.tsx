import { useState, useRef, useEffect, useMemo, useCallback } from "react";
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
  ShareNetworkIcon,
  HouseIcon,
  RabbitIcon,
  DoorOpenIcon,
  ShieldStarIcon,
  CheckIcon,
  FileTextIcon,
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
  ISpotlightAction,
  ISubviewDefinition,
  IUnifiedSearchItem,
  SpotlightMainItem,
} from "./spotlight.d";
import { getNodeDescription } from "../../../utils/graph";
import useRabbithole from "../../../hooks/useRabbithole";
import { IRabbithole } from "../../../../app/database/models/rabbithole";
import { useLandscape } from "../../../contexts/LandscapeContext";

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

async function fetchSuggestedRabbitholes(
  query: string,
): Promise<IRabbithole[]> {
  try {
    const response = await api.get(
      `/search/rabbitholes/suggest?query=${query}`,
    );
    return response.data.data as IRabbithole[];
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
  const [debouncedSpotlightValue, setDebouncedSpotlightValue] = useState("");
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [currentSubviewId, setCurrentSubviewId] = useState<string | null>(null);
  const [displayedItems, setDisplayedItems] = useState<IUnifiedSearchItem[]>(
    [],
  );
  const currentSearchRef = useRef<number>(0);

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

  const { mainSpotlightItems, subviewDefinitions } = useSpotlightConfig({
    onClose: closeSpotlightAndResetView,
  });

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

  // Debounce spotlight value for idea search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSpotlightValue(spotlightValue);
    }, 300); // 300ms delay

    return () => clearTimeout(timeoutId);
  }, [spotlightValue]);

  // Handle immediate search (non-debounced)
  useEffect(() => {
    if (currentSubviewId) {
      const subview = subviewDefinitions.get(currentSubviewId);

      if (subview?.component) {
        setDisplayedItems([]);
        return;
      }

      // Skip dynamic items for idea switcher - handled by debounced effect
      if (subview?.dynamicItems && currentSubviewId === "ideaSwitcherSubview") {
        return;
      }

      if (subview?.dynamicItems) {
        const searchId = ++currentSearchRef.current;

        subview
          .dynamicItems({
            searchText: spotlightValue,
            closeSpotlight: closeSpotlightAndResetView,
          })
          .then((actions) => {
            // Only update if this is still the latest search
            if (searchId === currentSearchRef.current) {
              setDisplayedItems(
                actions.map((item) => ({
                  ...item,
                  displayTitle: item.title,
                  displayDescription: item.description,
                  isTopLevel: false,
                })),
              );
              setActiveItemIndex(0);
            }
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
        setActiveItemIndex(0);
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
    setActiveItemIndex(0);
  }, [
    spotlightValue,
    unifiedSearchItems,
    currentSubviewId,
    subviewDefinitions,
    closeSpotlightAndResetView,
  ]);

  // Handle debounced search for idea switcher
  useEffect(() => {
    if (currentSubviewId === "ideaSwitcherSubview") {
      const subview = subviewDefinitions.get(currentSubviewId);

      if (subview?.dynamicItems) {
        const searchId = ++currentSearchRef.current;

        subview
          .dynamicItems({
            searchText: debouncedSpotlightValue,
            closeSpotlight: closeSpotlightAndResetView,
          })
          .then((actions) => {
            // Only update if this is still the latest search
            if (searchId === currentSearchRef.current) {
              setDisplayedItems(
                actions.map((item) => ({
                  ...item,
                  displayTitle: item.title,
                  displayDescription: item.description,
                  isTopLevel: false,
                })),
              );
              setActiveItemIndex(0);
            }
          });
      }
    }
  }, [
    debouncedSpotlightValue,
    currentSubviewId,
    subviewDefinitions,
    closeSpotlightAndResetView,
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

type IUseSpotlightConfig = {
  onClose: () => void;
};

type IUseSpotlightReturn = {
  mainSpotlightItems: SpotlightMainItem[];
  subviewDefinitions: Map<string, ISubviewDefinition>;
};

const useSpotlightConfig = ({
  onClose,
}: IUseSpotlightConfig): IUseSpotlightReturn => {
  const {
    ui: {
      theme: {
        scheme: { set: setScheme },
        bodyFont: { set: setBodyFont },
      },
    },
  } = useSettings();

  const {
    rabbitholes: {
      entered: { set: setEnteredRabbithole },
    },
  } = useLandscape();
  const { exitRabbithole, isDownRabbithole } = useRabbithole();
  const { isSuperuser } = useAuth();

  const {
    state: { spotlightOpened },
    actions: {
      layout: {
        spotlight: { close: contextCloseSpotlight },
      },
      newIdea,
      newRabbithole,
      newTask,
      newSource,
    },
    views: {
      dashboard,
      graph: viewGraph,
      spyglass,
      ideas,
      rabbitholes,
      settings,
      profile,
      tags,
      updates,
      tasks,
      sources,
      sharedIdeas,
      admin,
    },
  } = useInteraction();

  const navigate = useNavigate();

  const mainSpotlightItems = useMemo<SpotlightMainItem[]>(
    () => [
      {
        id: "closeCmd",
        title: "Close",
        icon: <ArrowLeftIcon />,
        action: onClose,
      },
      {
        id: "ideaSwitcher",
        title: "Fast find idea",
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
        id: "rabbitholes",
        title: "Rabbitholes",
        icon: <RabbitIcon />,
        subviewId: "rabbitholesSubview",
      },
      {
        id: "tasks",
        title: "Tasks",
        icon: <CheckIcon />,
        subviewId: "tasksSubview",
      },
      {
        id: "sources",
        title: "Sources",
        icon: <FileTextIcon />,
        subviewId: "sourcesSubview",
      },
      {
        id: "enterRabbithole",
        title: "Enter Rabbithole",
        icon: <RabbitIcon />,
        subviewId: "enterRabbitholeSubview",
      },
      {
        id: "homeCmd",
        title: "Home",
        icon: <HouseIcon />,
        action: () => {
          dashboard();
          onClose();
        },
      },
      {
        id: "graphCmd",
        title: "Constellation",
        icon: <GraphIcon />,
        action: () => {
          viewGraph();
          onClose();
        },
      },
      {
        id: "spyglassCmd",
        title: "Spyglass",
        icon: <MagnifyingGlassIcon />,
        action: () => {
          spyglass();
          onClose();
        },
      },
      {
        id: "tagsCmd",
        title: "Tags",
        icon: <TagIcon />,
        action: () => {
          tags();
          onClose();
        },
      },
      {
        id: "updatesCmd",
        title: "Updates",
        icon: <ScrollIcon />,
        action: () => {
          updates();
          onClose();
        },
      },
      {
        id: "settingsCmd",
        title: "Settings",
        icon: <GearIcon />,
        action: () => {
          settings();
          onClose();
        },
      },
      {
        id: "profileCmd",
        title: "Profile",
        icon: <UserIcon />,
        action: () => {
          profile();
          onClose();
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
      ...(isSuperuser
        ? [
            {
              id: "admin",
              title: "Admin",
              icon: <ShieldStarIcon />,
              action: () => {
                admin();
                onClose();
              },
            },
          ]
        : []),
    ],
    [
      onClose,
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
                  onClose();
                },
              },
              {
                id: "ideasCmd",
                title: "Ideas List",
                icon: <LightbulbIcon />,
                action: () => {
                  ideas();
                  onClose();
                },
              },
              {
                id: "sharedIdeasCmd",
                title: "Shared Ideas",
                icon: <ShareNetworkIcon />,
                action: () => {
                  sharedIdeas();
                  onClose();
                },
              },
            ],
          },
        ],
        [
          "rabbitholesSubview",
          {
            id: "rabbitholes",
            title: "Rabbitholes",
            items: [
              {
                id: "rabbitholesCmd",
                title: "Rabbitholes List",
                icon: <RabbitIcon />,
                action: () => {
                  rabbitholes();
                  onClose();
                },
              },
              {
                id: "newRabbitholeCmd",
                title: "New Rabbithole",
                icon: <RabbitIcon />,
                action: () => {
                  newRabbithole();
                  onClose();
                },
              },
              ...(isDownRabbithole
                ? [
                    {
                      id: "exitRabbithole",
                      title: "Exit Rabbithole",
                      icon: <DoorOpenIcon />,
                      action: () => {
                        exitRabbithole();
                        onClose();
                      },
                    },
                  ]
                : []),
            ],
          },
        ],
        [
          "tasksSubview",
          {
            id: "tasksSubview",
            title: "Tasks",
            items: [
              {
                id: "newTask",
                title: "New Task",
                icon: <CheckIcon />,
                action: () => {
                  newTask();
                  onClose();
                },
              },
              {
                id: "allTasks",
                title: "Task List",
                icon: <CheckIcon />,
                action: () => {
                  tasks();
                  onClose();
                },
              },
            ],
          },
        ],
        [
          "sourcesSubview",
          {
            id: "sourcesSubview",
            title: "Sources",
            items: [
              {
                id: "newTask",
                title: "New Source",
                icon: <FileTextIcon />,
                action: () => {
                  newSource();
                  onClose();
                },
              },
              {
                id: "allSources",
                title: "Sources",
                icon: <FileTextIcon />,
                action: () => {
                  sources();
                  onClose();
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
        [
          "enterRabbitholeSubview",
          {
            id: "enterRabbitholeSubview",
            title: "Enter Rabbithole",
            placeholder: "Search for an rabbithole to enter...",
            dynamicItems: async ({ searchText, closeSpotlight }) => {
              const suggestedItems =
                await fetchSuggestedRabbitholes(searchText);

              return suggestedItems.map((rabbithole) => ({
                id: rabbithole.id.toString(),
                title: rabbithole.name,
                description: getNodeDescription({
                  ...rabbithole,
                  type: "rabbithole",
                }),
                icon: <LightbulbIcon />,
                action: () => {
                  setEnteredRabbithole(rabbithole);
                  closeSpotlight();
                },
              }));
            },
          },
        ],
      ]),
    [setScheme, setBodyFont],
  );

  return {
    mainSpotlightItems,
    subviewDefinitions,
  };
};
