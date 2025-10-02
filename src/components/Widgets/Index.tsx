import { IWidgetMap } from "./index.d";

const widgets: IWidgetMap = {
  glance: () => import("./library/Glance"),
  serendipity: () => import("./library/Serendipity"),
  constellation: () => import("./library/Constellation"),
  scratchpad: () => import("./library/Scratchpad"),
  taskList: () => import("./library/TaskList"),
  rabbitholeList: () => import("./library/RabbitholeList"),
  heatmap: () => import("./library/Heatmap"),
  miniGraph: () => import("./library/MiniGraph"),
  tagBreakdown: () => import("./library/TagBreakdown"),
};

export default widgets;
