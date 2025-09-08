import { ComponentType } from "react";
import {
  IExcerpt,
  IExcerptForm,
} from "../../../../../app/database/models/excerpt";
import { RecordId } from "surrealdb";

export type IDynamicComponentImport = () => Promise<{
  default: ComponentType<{
    fileId: string | RecordId;
  }>;
}>;

type IMimeType = "application/pdf" | string;

export type IViewerMap = Record<IMimeType, IDynamicComponentImport>;

export const ViewerMap: IViewerMap = {
  "application/pdf": () => import("./PDF/PDF"),
};
