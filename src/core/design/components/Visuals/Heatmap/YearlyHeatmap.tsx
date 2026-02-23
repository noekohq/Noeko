import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { IHeatmapData } from "./types";
import styles from "./YearlyHeatmap.module.scss";

export interface IHeatmapStyleOptions {
  cellRadius?: number;
  cellStroke?: string;
  cellStrokeWidth?: number;
  emptyCellColor?: string;
  cellSpacing?: number;
  monthLabelColor?: string;
  monthLabelFontSize?: string | number;
  dayLabelColor?: string;
  dayLabelFontSize?: string | number;
}

interface IYearlyHeatmapProps {
  data: IHeatmapData[];
  year: number;
  colorRange?: [string, string];
  styleOptions?: IHeatmapStyleOptions;
}

const YearlyHeatmap: React.FC<IYearlyHeatmapProps> = ({
  data,
  year,
  colorRange = ["var(--mantine-color-dark-9)", "var(--mantine-color-dark-1)"],
  styleOptions = {},
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (wrapperRef.current) {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry && entry.contentRect) {
          setDimensions({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      });
      observer.observe(wrapperRef.current);
      return () => observer.disconnect();
    }
  }, []);

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0) {
      return;
    }

    const {
      cellRadius = 0,
      cellStroke = "black",
      cellStrokeWidth = 1,
      emptyCellColor = "var(--mantine-color-dark-9)",
      cellSpacing = 1,
      monthLabelColor,
      monthLabelFontSize,
      dayLabelColor,
      dayLabelFontSize,
    } = styleOptions;

    const { width } = dimensions;
    const svg = d3.select(svgRef.current);

    svg.selectAll("*").remove();

    const dataMap = new Map(data.map((d) => [d.date, d.value]));
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    const allDays = d3.timeDays(startDate, endDate);

    const cellSize = (width - 50) / 53;
    const height = cellSize * 7 + 30;
    const weekDays = ["S", "M", "T", "W", "T", "F", "S"];
    const monthLabels = d3.timeMonths(startDate, endDate).map((d) => ({
      month: d3.timeFormat("%b")(d),
      firstDay: d,
    }));

    svg.attr("width", width).attr("height", height);
    const g = svg.append("g").attr("transform", "translate(30, 20)");

    const maxVal = d3.max(data, (d) => d.value) || 1;
    const colorScale = d3.scaleLinear<string>().domain([0, maxVal]).range(colorRange);

    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", styles.tooltip)
      .style("position", "absolute")
      .style("opacity", 0);

    const mouseover = (event: MouseEvent, d: Date) => {
      tooltip.style("opacity", 1);
      d3.select(event.currentTarget as SVGRectElement)
        .style("stroke", cellStroke)
        .style("stroke-width", cellStrokeWidth);
    };
    const mousemove = (event: MouseEvent, d: Date) => {
      const dateStr = d.toISOString().split("T")[0];
      const value = dataMap.get(dateStr);
      const text = `${d3.timeFormat("%B %d, %Y")(d)}: ${value ? value.toFixed(2) : "No data"}`;
      tooltip
        .html(text)
        .style("left", `${event.pageX + 15}px`)
        .style("top", `${event.pageY}px`);
    };
    const mouseleave = (event: MouseEvent) => {
      tooltip.style("opacity", 0);
      d3.select(event.currentTarget as SVGRectElement).style("stroke", "none");
    };

    g.selectAll("rect")
      .data(allDays)
      .join("rect")
      .attr("width", cellSize - cellSpacing)
      .attr("height", cellSize - cellSpacing)
      .attr("rx", cellRadius)
      .attr("x", (d) => d3.timeWeek.count(d3.timeYear(d), d) * cellSize)
      .attr("y", (d) => d.getDay() * cellSize)
      .attr("fill", (d) => {
        const value = dataMap.get(d.toISOString().split("T")[0]);
        return value !== undefined ? colorScale(value) : emptyCellColor;
      })
      .on("mouseover", mouseover)
      .on("mousemove", mousemove)
      .on("mouseleave", mouseleave);

    // Month Labels
    g.selectAll(".monthLabel")
      .data(monthLabels)
      .join("text")
      .attr("class", styles.monthLabel)
      .text((d) => d.month)
      .attr("x", (d) => d3.timeWeek.count(d3.timeYear(d.firstDay), d.firstDay) * cellSize)
      .attr("y", -5)
      .style("font-size", monthLabelFontSize as any)
      .style("fill", monthLabelColor as any);

    g.selectAll(".dayLabel")
      .data(weekDays.filter((_, i) => i % 2 !== 0)) // Show M, W, F
      .join("text")
      .attr("class", styles.dayLabel)
      .text((d) => d)
      .attr("x", -15)
      .attr("y", (d, i) => (i * 2 + 1) * cellSize + cellSize / 1.5)
      .style("font-size", dayLabelFontSize as any)
      .style("fill", dayLabelColor as any);

    return () => {
      tooltip.remove();
    };
  }, [data, year, dimensions, colorRange, styleOptions]); // Rerun effect when data or dimensions change

  return (
    <div ref={wrapperRef} className={styles.heatmapContainer}>
      <svg ref={svgRef} />
    </div>
  );
};

export default YearlyHeatmap;
