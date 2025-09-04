import { ComponentType } from "react";
import {
  IExcerpt,
  IExcerptForm,
} from "../../../../../app/database/models/excerpt";
import { RecordId } from "surrealdb";

export type IDynamicComponentImport = () => Promise<{
  default: ComponentType<{
    fileId: string | RecordId;
    excerpts?: IExcerpt[];
    onExcerpt?: (data: IExcerptForm) => void;
    editExcerpt?: (id: string | RecordId, newNote: string) => void;
    deleteExcerpt?: (id: string | RecordId) => void;
  }>;
}>;

type IMimeType = "application/pdf" | string;

export type IViewerMap = Record<IMimeType, IDynamicComponentImport>;

export const ViewerMap: IViewerMap = {
  "application/pdf": () => import("./PDF"),
};
