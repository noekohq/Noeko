import styles from "./Constellation.module.scss";
import { IWidgetConfig } from "../index.d";
import GraphContainer, { IGraphController } from "../../Graph/Graph";
import { useSearch } from "../../../contexts/SearchContext";
import { useEffect, useMemo, useRef } from "react";
import useFetch from "../../../hooks/useFetch";
import {
  IConnectable,
  IConstellationLoader,
  IGraphFilters,
  ILoadedConstellation,
} from "../../../../app/services/Graph";
import GraphLoader from "../../Utils/Loading/GraphLoader";
import { useLandscape } from "../../../contexts/LandscapeContext";
import { fromConstellation, getNodeTitle } from "../../../utils/graph";
import { ActionIcon, Group, Text } from "@mantine/core";
import { Link } from "react-router";
import { ArrowsOutIcon, XIcon } from "@phosphor-icons/react";
import { formatDate } from "../../../utils/formatting";
import { useGraph } from "../../../contexts/GraphContext";
import { useInteraction } from "../../../contexts/InteractionContext";
import { useTourStep } from "../../../contexts/TourGuideContext";

export default function Constellation() {
  const {
    global: {
      results: { get: searchResults },
      query: { get: searchQuery },
    },
  } = useSearch();
  const graphRef = useRef<IGraphController>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    rabbitholes: {
      entered: { get: currentRabbithole },
    },
  } = useLandscape();

  // PAST MONTH
  const end = new Date();
  end.setUTCHours(23, 59, 59, 0);
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 27);
  start.setUTCHours(0, 0, 0, 0);

  const startDate = start.toISOString().substring(0, 19) + "Z";
  const endDate = end.toISOString().substring(0, 19) + "Z";

  const {
    data: constellationData,
    load: reloadConstellation,
    loading: loadingConstellation,
  } = useFetch<{ loader: IConstellationLoader; filters: IGraphFilters }, ILoadedConstellation>({
    url: "/graph",
    method: "POST",
    body: {
      loader: {
        things: true,
        rabbitholes: true,
        tags: true,
        connections: true,
        inclusions: true,
        descriptions: true,
        references: true,
      },
      filters: {
        ...(currentRabbithole
          ? {
              rabbithole: currentRabbithole?.id.toString(),
            }
          : {
              date: {
                createdAt: {
                  after: startDate,
                  before: endDate,
                },
              },
            }),
      },
    },
    dependencies: [currentRabbithole?.id],
    onFinally: () => {
      graphRef.current?.reset();
    },
  });

  const {
    selected: { get: selected, set: setSelected },
    focused: { set: setFocused },
    highlighted: { set: setHighlighted, clear: clearHighlighted },
  } = useGraph();

  useEffect(() => {
    if (!searchQuery.length) {
      clearHighlighted();
      return;
    }
    setHighlighted(
      searchResults?.map((r) => {
        return r.id.toString();
      }) || []
    );
  }, [searchResults, searchQuery]);

  useEffect(() => {
    reloadConstellation();
    setFocused(currentRabbithole?.id.toString() || "");
  }, [currentRabbithole]);

  const graphData = useMemo(
    () => (constellationData ? fromConstellation(constellationData) : undefined),
    [constellationData]
  );

  const isLoading = loadingConstellation || !graphData;

  const {
    views: { graph },
  } = useInteraction();

  const statusText = () => {
    const defaultText = `Since ${formatDate(start)}`;
    if (currentRabbithole) {
      return `${currentRabbithole.name}`;
    }
    if (selected.size > 0) {
      if (selected.size === 1) {
        const first = Array.from(selected.entries())[0][1];
        if (!first) {
          return defaultText;
        }
        const node = graphRef.current?.nodes().find((node) => node.id.toString() === first);
        if (!node) {
          return defaultText;
        }
        return `${getNodeTitle(node)}`;
      }
      return `${selected.size} Selected`;
    }
    return defaultText;
  };

  const clippedText = (text: string, maxLength: number) => {
    if (text.length > maxLength) {
      return `${text.slice(0, maxLength)}...`;
    }
    return text;
  };

  const tourRef = useTourStep({
    id: "feature:widget_recent_constellation",
    title: "Recent Constellation",
    content: "This is a mini constellation to let you visualize your recent activity.",
    view: "dashboard",
    order: 1,
  });

  return (
    <div ref={containerRef} className={styles.constellation}>
      <div ref={tourRef} style={{ position: "relative" }}>
        <div className={styles.floatingUI}>
          <Group gap="xs" align="center">
            <ActionIcon
              variant="light"
              color="gray"
              size="sm"
              title="Full constellation"
              onClick={() => {
                graph();
              }}
            >
              <ArrowsOutIcon />
            </ActionIcon>
            {selected.size > 0 && (
              <ActionIcon
                variant="light"
                color="gray"
                size="sm"
                onClick={() => {
                  setSelected([]);
                }}
                title="Clear selection"
              >
                <XIcon weight="bold" />
              </ActionIcon>
            )}
          </Group>
          <Text size="sm" c="dark.5">
            {clippedText(statusText(), 24)}
          </Text>
        </div>
        {!!graphData && !isLoading && (
          <GraphContainer
            width={containerRef.current?.clientWidth}
            height={containerRef.current?.clientHeight}
            graph={graphData}
          />
        )}
      </div>
      {isLoading && <GraphLoader />}
    </div>
  );
}

export const config: IWidgetConfig = {
  columns: {
    default: 8,
    min: 8,
    max: 12,
  },
};
