import { IWidgetMap } from "./index.d";

const widgets: IWidgetMap = {
  scratchpad: () => import("./library/Scratchpad"),
  taskList: () => import("./library/TaskList"),
  rabbitholeList: () => import("./library/RabbitholeList"),
  heatmap: () => import("./library/Heatmap"),
};

export default widgets;
