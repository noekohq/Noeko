import { RecordId } from "surrealdb";
import type { IConnectable } from "./constellation";
import type { IEmbeddingMetadata } from "./embeddings";

export type ITagDescribes = IConnectable;

export type ITag = IEmbeddingMetadata & {
  id: string | RecordId;
  name: string;
  description: string;
  color?: string; // Optional: hex code for tag color
  embeddings: number[] | null;
  cachedCentroidEmbeddings: number[] | null;
  describes: ITagDescribes;
  embeddingsUpdatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type ITagForm = Omit<
  ITag,
  | "id"
  | "embeddings"
  | "cachedCentroidEmbeddings"
  | "describes"
  | "embeddingsUpdatedAt"
  | "createdAt"
  | "updatedAt"
>;

export type ITagUserOwnership = {
  id: string | RecordId;
  in: string | RecordId; // User ID
  out: string | RecordId; // Tag ID
  createdAt: Date;
};

export type ITagDescriptionRelationship = {
  id: string | RecordId;
  in: string | RecordId; // Tag ID
  out: string | RecordId; // Idea ID
  createdAt: Date;
};
