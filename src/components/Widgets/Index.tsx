import { IWidgetMap } from "./index.d";

const widgets: IWidgetMap = {
  scratchpad: () => import("./library/Scratchpad"),
  taskList: () => import("./library/TaskList"),
  rabbitholeList: () => import("./library/RabbitholeList"),
  heatmap: () => import("./library/Heatmap"),
  miniGraph: () => import("./library/MiniGraph"),
  tagBreakdown: () => import("./library/TagBreakdown"),
};

export default widgets;
