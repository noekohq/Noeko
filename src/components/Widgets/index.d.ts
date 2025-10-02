export type IAvailableWidgets =
  | "glance"
  | "constellation"
  | "serendipity"
  | "scratchpad"
  | "taskList"
  | "heatmap"
  | "rabbitholeList"
  | "miniGraph"
  | "tagBreakdown";

export type IWidgetConfig = {
  columns: {
    default: number;
    min: number;
    max: number;
  };
};

export type IDynamicComponentImport = () => Promise<{
  default: ComponentType<any>;
  config: IWidgetConfig;
}>;

export type IWidgetMap = Record<IAvailableWidgets, IDynamicComponentImport>;
