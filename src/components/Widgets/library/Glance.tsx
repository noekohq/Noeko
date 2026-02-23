import styles from "./Glance.module.scss";
import { IWidgetConfig } from "../index.d";
import { Group, SegmentedControl, Stack, Text } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import useFetch from '@/hooks/useFetch';
import { IHeatmapDataPoint } from '../../../../app/services/Analysis';
import { IHeatmapData } from "../../Visuals/Heatmap/types";
import YearlyHeatmap from "../../Visuals/Heatmap/YearlyHeatmap";
import { LineChart } from "@mantine/charts";
import { formatDate } from '@/utils/formatting';
import { useTourStep } from '@/contexts/TourGuideContext';

type IVisualOptions = "chart" | "heatmap";

interface IProgressDataPoint {
  date: string;
  [key: string]: number | string;
}

export default function Glance() {
  const end = new Date();
  end.setUTCHours(23, 59, 59, 0);

  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 27);
  start.setUTCHours(0, 0, 0, 0);

  const startDate = start.toISOString().substring(0, 19) + "Z";
  const endDate = end.toISOString().substring(0, 19) + "Z";
  const dataTypes = ["idea", "task"];

  const {
    data: progressData,
    load: loadProgress,
    loading: loadingProgress,
  } = useFetch<undefined, IProgressDataPoint[]>({
    url: `/analysis/progress?startDate=${startDate}&endDate=${endDate}&dataTypes=${dataTypes.join(
      ","
    )}`,
  });

  useEffect(() => {
    loadProgress();
  }, []);

  const glanceRef = useTourStep({
    id: "feature:widget_glance",
    title: "Glance",
    content:
      "This widget will show you recent progress at a glance, ideas you've made, tasks you've created, etc.",
    view: "dashboard",
    order: 4,
  });

  return (
    <div className={styles.glance} ref={glanceRef}>
      <Text size="sm" c="dimmed" ta="center">
        Your activity since {formatDate(start)}.
      </Text>
      <div className={styles.chart}>
        <ChartView
          progress={progressData || []}
          dataTypes={dataTypes}
          startDate={startDate}
          endDate={endDate}
        />
      </div>
      <div className={styles.breakdown}></div>
    </div>
  );
}

interface IHeatmapViewProps {
  heatmap: IHeatmapDataPoint[];
}

interface IChartViewProps {
  progress: IProgressDataPoint[];
  dataTypes: string[];
  startDate: string;
  endDate: string;
}

function ChartView({ progress, dataTypes, startDate, endDate }: IChartViewProps) {
  const colors = ["blue", "green", "orange"];
  const container = useRef<HTMLDivElement>(null);

  const chartDataMap = new Map<string, { date: string; [key: string]: any }>();
  const currentDate = new Date(startDate);
  const end = new Date(endDate);

  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const formattedDate = currentDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const dataPoint: { date: string; [key: string]: any } = {
      date: formattedDate,
    };
    dataTypes.forEach((dt) => {
      const seriesName = dt.charAt(0).toUpperCase() + dt.slice(1) + "s";
      dataPoint[seriesName] = 0;
    });
    chartDataMap.set(dateStr, dataPoint);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  progress.forEach((p) => {
    const dataPoint = chartDataMap.get(p.date);
    if (dataPoint) {
      dataTypes.forEach((dt) => {
        if (p[dt] !== undefined) {
          const seriesName = dt.charAt(0).toUpperCase() + dt.slice(1) + "s";
          dataPoint[seriesName] = p[dt] as number;
        }
      });
    }
  });

  const chartData = Array.from(chartDataMap.values());

  const series = dataTypes.map((dt, index) => ({
    name: dt.charAt(0).toUpperCase() + dt.slice(1) + "s",
    color: colors[index % colors.length],
  }));

  return (
    <div className={styles.chart} ref={container}>
      <LineChart
        h={200}
        data={chartData}
        dataKey="date"
        series={series}
        withLegend={false}
        withYAxis={false}
        withXAxis={false}
        curveType="linear"
        gridAxis="none"
        tickLine="none"
        yAxisProps={{ domain: [0, "auto"] }}
        xAxisProps={{
          padding: { left: 10, right: 10 },
          tickLine: { display: "none" },
          label: { display: "none" },
        }}
        valueFormatter={(value) => (value ? value.toString() : "")}
      />
    </div>
  );
}

function HeatmapView({ heatmap }: IHeatmapViewProps) {
  const transformed: IHeatmapData[] = heatmap.map((v) => {
    return {
      value: v.count,
      date: v.date,
    };
  });

  return (
    <div className={styles.heatmap}>
      <YearlyHeatmap year={new Date().getFullYear()} data={transformed} />
    </div>
  );
}

export const config: IWidgetConfig = {
  columns: {
    default: 7,
    min: 8,
    max: 12,
  },
};
