import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useInteraction } from "../../../contexts/InteractionContext";
import { createPortal } from "react-dom";
import styles from "./Spotlight.module.scss";
import MiniSearch, { SearchResult } from "minisearch";
import {
  Gear,
  Graph,
  HouseSimple,
  Lightbulb,
  MagnifyingGlass,
  User,
} from "@phosphor-icons/react";
import { userIsSuperuser } from "../../../utils/user";
import { useAuth } from "../../../contexts/AuthContext";

export type ISpotlightOption = {
  id: string;
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
};

export type ISpotlightSubview = (text: string) => React.ReactNode;

const minisearch = new MiniSearch({
  fields: ["title"],
  storeFields: ["id", "title", "icon"],
});

export default function Spotlight() {
  const {
    state: { spotlightOpened },
    actions: {
      layout: {
        spotlight: { close: closeSpotlight },
      },
    },
    views: { dashboard, graph, spyglass, ideas, settings, profile, admin },
  } = useInteraction();

  const spotlightRef = useRef<HTMLInputElement>(null);
  const [spotlightValue, setSpotlightValue] = useState("");
  const [active, setActive] = useState(0);

  const { user } = useAuth();
  const isSuperuser = userIsSuperuser(user);

  const options: Map<string, ISpotlightOption> = useMemo<
    Map<string, ISpotlightOption>
  >(
    () =>
      new Map([
        [
          "home",
          {
            id: "home",
            title: "Home",
            icon: <HouseSimple weight="bold" />,
            onClick: dashboard,
          },
        ],
        [
          "graph",
          {
            id: "graph",
            title: "Graph",
            icon: <Graph weight="bold" />,
            onClick: graph,
          },
        ],
        [
          "spyglass",
          {
            id: "spyglass",
            title: "Spyglass",
            icon: <MagnifyingGlass weight="bold" />,
            onClick: spyglass,
          },
        ],
        [
          "ideas",
          {
            id: "ideas",
            title: "Ideas",
            icon: <Lightbulb weight="bold" />,
            onClick: ideas,
          },
        ],
        [
          "settings",
          {
            id: "settings",
            title: "Settings",
            icon: <Gear weight="bold" />,
            onClick: settings,
          },
        ],
        [
          "profile",
          {
            id: "profile",
            title: "Profile",
            icon: <User weight="bold" />,
            onClick: profile,
          },
        ],
      ]),
    [],
  );

  useEffect(() => {
    minisearch.addAll(
      Array.from(
        options.entries().map(([id, option]) => ({
          id,
          title: option.title,
          icon: option.icon,
          onClick: option.onClick,
        })),
      ),
    );

    return () => {
      minisearch.removeAll();
    };
  }, []);

  const [results, setResults] = useState<ISpotlightOption[]>([]);

  useEffect(() => {
    setActive(0);
  }, [spotlightValue, spotlightOpened]);

  const searchResultsToOptions = (results: SearchResult[]) => {
    return results.map((result) => options.get(result.id)).filter((i) => !!i);
  };

  useEffect(() => {
    if (!spotlightValue) {
      setResults(Array.from(options.entries().map(([_, option]) => option)));
    } else {
      const searchResults = minisearch.search(spotlightValue, {
        fuzzy: 0.3,
        prefix: true,
      });
      setResults(searchResultsToOptions(searchResults));
    }
  }, [spotlightValue]);

  useEffect(() => {
    if (spotlightOpened && spotlightRef.current) {
      setSpotlightValue("");
      spotlightRef.current.focus();
    }
  }, [spotlightOpened]);

  const activeResult = results[active];

  const handleSelectActiveResult = useCallback(() => {
    activeResult.onClick();
    closeSpotlight();
  }, [activeResult]);

  const handleSelectResult = useCallback((result: ISpotlightOption) => {
    result.onClick();
    closeSpotlight();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!spotlightOpened) {
        return;
      }

      const visibleOptions = spotlightValue
        ? results
        : Array.from(options.values());
      const maxIndex = visibleOptions.length - 1;

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((prev) => Math.max(0, prev - 1));
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((prev) => Math.min(maxIndex, prev + 1));
      }
      if (event.key === "Enter") {
        handleSelectActiveResult();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [results, active, activeResult]);

  if (!spotlightOpened) {
    return null;
  }

  return createPortal(
    <div className={styles.spotlightOverlay} onClick={closeSpotlight}>
      <div className={styles.spotlight} onClick={(e) => e.stopPropagation()}>
        <input
          className={styles.input}
          type="text"
          value={spotlightValue}
          onChange={(e) => setSpotlightValue(e.target.value)}
          ref={spotlightRef}
          placeholder="Search for anything..."
        />
        <div className={styles.resultsContainer}>
          {results.length > 0 ? (
            <div className={styles.results}>
              {results.map((result, i) => (
                <Option
                  key={result.id}
                  icon={result.icon}
                  title={result.title}
                  active={i === active}
                  setActive={() => setActive(i)}
                  onClick={() => {
                    handleSelectResult(result);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className={styles.noResults}>No results found</div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

type IOptionProps = {
  icon: React.ReactNode;
  title: string;
  active: boolean;
  setActive: () => void;
  onClick: () => void;
};

function Option({ icon, title, active, setActive, onClick }: IOptionProps) {
  return (
    <div
      className={`${styles.result} ${active ? styles.active : ""}`}
      onMouseEnter={() => {
        setActive();
      }}
      onClick={onClick}
    >
      <div className={styles.icon}>{icon}</div>
      <div className={styles.title}>{title}</div>
    </div>
  );
}
