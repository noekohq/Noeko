import { useEffect } from "react";
import { IHeatmapDataPoint } from "../../../../app/services/Analysis";
import useFetch from "../../../hooks/useFetch";
import { IWidgetConfig } from "../index.d";
import { Heatmap } from "@mantine/charts";
import { Button, Group, Text, Title } from "@mantine/core";
import styles from "./Heatmap.module.scss";
import { formatDate } from "../../../utils/formatting";
import { useInteraction } from "../../../contexts/InteractionContext";

export default function HeatmapWidget() {
  const {
    data: heatmapData,
    load: loadHeatmap,
    loading: loadingHeatmap,
  } = useFetch<undefined, IHeatmapDataPoint[]>({
    url: "/analysis/heatmap",
  });

  const transformedData = heatmapData?.reduce(
    (acc, curr) => ({
      ...acc,
      [curr.date]: curr.count,
    }),
    {}
  );

  useEffect(() => {
    loadHeatmap();
  }, []);

  const currentYear = new Date().getFullYear();
  const firstDayOfYear = new Date(currentYear, 0, 1);
  const lastDayOfYear = new Date(currentYear, 11, 31);

  const totalIdeas = heatmapData?.reduce((acc, curr) => {
    return acc + curr.count;
  }, 0);

  const {
    actions: { newIdea },
  } = useInteraction();

  return (
    <div className={styles.heatmap}>
      <Title order={3}>Your ideas in {currentYear}</Title>
      {!transformedData && (
        <Text size="sm" c="dimmed">
          Loading...
        </Text>
      )}
      {!!transformedData && (
        <div className={styles.heatmapContainer}>
          <Heatmap
            data={transformedData}
            colors={[
              "var(--mantine-color-orange-4)",
              "var(--mantine-color-orange-6)",
              "var(--mantine-color-orange-7)",
              "var(--mantine-color-orange-9)",
            ]}
            withMonthLabels
            withWeekdayLabels
            classNames={{
              root: styles.root,
              rect: styles.rect,
            }}
            startDate={firstDayOfYear}
            endDate={lastDayOfYear}
            withTooltip
            getTooltipLabel={(d) => {
              return (
                <Text size="xs">
                  {d.value ?? 0} idea{d.value === 1 ? "" : "s"} on {d.date}
                </Text>
              );
            }}
            rectRadius={2}
            gap={2}
          />
        </div>
      )}
      {!!heatmapData && !heatmapData.length && (
        <Text size="sm" c="dimmed">
          Looks like you don't have any data for this yet!
        </Text>
      )}
      {!!heatmapData && !!heatmapData.length && (
        <>
          <Text size="sm" c="dimmed">
            You have {totalIdeas} idea{totalIdeas === 1 ? "" : "s"}!
          </Text>
          <Group>
            <Button
              size="xs"
              variant="light"
              onClick={() => {
                newIdea();
              }}
            >
              Add an idea!
            </Button>
          </Group>
        </>
      )}
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
