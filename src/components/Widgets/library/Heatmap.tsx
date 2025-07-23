import { useEffect } from "react";
import { IHeatmapDataPoint } from "../../../../app/services/Analysis";
import useFetch from "../../../hooks/useFetch";
import { IWidgetConfig } from "../index.d";
import { Heatmap } from "@mantine/charts";
import { Text, Title } from "@mantine/core";
import styles from "./Heatmap.module.scss";

export default function HeatmapWidget() {
  const {
    data: heatmapData,
    load: loadHeatmap,
    loading: loadingHeatmap,
  } = useFetch<undefined, IHeatmapDataPoint[]>({
    url: "/analysis/heatmap",
  });

  console.log("Heat map data: ", heatmapData);

  const transformedData = heatmapData?.reduce(
    (acc, curr) => ({
      ...acc,
      [curr.date]: curr.count,
    }),
    {},
  );

  useEffect(() => {
    loadHeatmap();
  }, []);

  const currentYear = new Date().getFullYear();

  return (
    <div className={styles.heatmap}>
      <Title>Your Heatmap for {currentYear}</Title>
      {!transformedData && (
        <Text size="sm" c="dimmed">
          Loading...
        </Text>
      )}
      {!!transformedData && <Heatmap data={transformedData} />}
      {!!heatmapData && !heatmapData.length && (
        <Text size="sm" c="dimmed">
          Looks like you don't have any data for this yet!
        </Text>
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
