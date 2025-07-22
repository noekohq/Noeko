export type IAvailableWidgets =
  | "scratchpad"
  | "taskList"
  | "heatmap"
  | "rabbitholeList";

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
