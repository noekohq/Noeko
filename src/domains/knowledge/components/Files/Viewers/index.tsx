import { ComponentType } from "react";
import { RecordId } from "surrealdb";

export type IDynamicComponentImport = () => Promise<{
  default: ComponentType<{
    fileId: string | RecordId;
    withinSource?: boolean;
  }>;
}>;

type IMimeType = "application/pdf" | string;

export type IViewerMap = Record<IMimeType, IDynamicComponentImport>;

export const ViewerMap: IViewerMap = {
  "application/pdf": () => import("./PDF/PDF"),
};
