import { RecordId } from "surrealdb";
import { IConnectable } from "./constellation";
import { ITag } from "./tags";

export type IRabbitholeIncludes = IConnectable | (ITag & { type: "tag" });

export type IRabbithole = {
  id: string | RecordId;
  name: string;
  includes?: IRabbitholeIncludes[];
  cachedCentroidEmbeddings?: number[];
  createdAt: Date;
  updatedAt: Date;
};

export type IRabbitholeCreator = Omit<IRabbithole, "id" | "includes">;

export type IRabbitholeForm = Omit<
  IRabbitholeCreator,
  "createdAt" | "updatedAt"
>;

export type IRabbitholeInclusion = {
  id: string | RecordId;
  in: string | RecordId;
  out: string | RecordId;
  createdAt: Date;
};
