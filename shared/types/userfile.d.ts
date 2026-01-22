import { RecordId } from "surrealdb";
import { ISource } from "./source";

export type IUserFile = {
  id: RecordId;
  s3key: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  source?: ISource;
  createdAt: Date;
  updatedAt: Date;
};

export type ISourceableMimeType = "application/pdf";

export type IUserFileForm = Omit<IUserFile, "id" | "createdAt" | "updatedAt">;

export type IUserFileUserOwnership = {
  id: RecordId;
  in: string;
  out: string;
};

export type IConnectableEmbedRelationship = {
  id: RecordId;
  in: string;
  out: string;
};
