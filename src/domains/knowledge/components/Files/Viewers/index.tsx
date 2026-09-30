import { ComponentType } from "react";
import { RecordId } from "surrealdb";
import {
  AUDIO_MIME_TYPES,
  IMAGE_MIME_TYPES,
  TEXT_MIME_TYPES,
  VIDEO_MIME_TYPES,
} from "../../../../../../shared/files/mimeTypes";
import { IUserFile } from "../../../../../../shared/types/userfile";
import { ISource } from "../../../../../../shared/types/source";

export interface IFileViewerProps {
  fileId: string | RecordId | undefined;
  file?: IUserFile;
  source?: ISource;
  withinSource?: boolean;
}

export type IDynamicComponentImport = () => Promise<{
  default: ComponentType<IFileViewerProps>;
}>;

type IMimeType = "application/pdf" | string;

export type IViewerMap = Record<IMimeType, IDynamicComponentImport>;

const loadAudioViewer: IDynamicComponentImport = () => import("./Audio/Audio");
const loadImageViewer: IDynamicComponentImport = () => import("./Image/Image");
const loadTextViewer: IDynamicComponentImport = () => import("./Text/Text");
const loadVideoViewer: IDynamicComponentImport = () => import("./Video/Video");

export const ViewerMap: IViewerMap = {
  "application/pdf": () => import("./PDF/PDF"),
  ...Object.fromEntries(AUDIO_MIME_TYPES.map((mimeType) => [mimeType, loadAudioViewer])),
  ...Object.fromEntries(IMAGE_MIME_TYPES.map((mimeType) => [mimeType, loadImageViewer])),
  ...Object.fromEntries(TEXT_MIME_TYPES.map((mimeType) => [mimeType, loadTextViewer])),
  ...Object.fromEntries(VIDEO_MIME_TYPES.map((mimeType) => [mimeType, loadVideoViewer])),
};
