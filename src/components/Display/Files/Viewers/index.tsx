import { ComponentType } from "react";

export type IDynamicComponentImport = () => Promise<{
  default: ComponentType<any>;
}>;

type IMimeType = "application/pdf" | string;

export type IViewerMap = Record<IMimeType, IDynamicComponentImport>;

export const ViewerMap: IViewerMap = {
  "application/pdf": () => import("./PDF"),
};
