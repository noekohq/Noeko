import { RecordId, StringRecordId } from "surrealdb";

export interface ISourceable {
  id: string | RecordId;
  owner: string | RecordId;
  content: string;
  name: string;
}

export type ISourceVisibility = "private" | "unlisted" | "public";

// ISourceReference needs to be generic to avoid circular dependency
export type ISourceReference = any;

export type ISource = {
  id: string | RecordId;
  displayName: string;
  content: string;
  visibility: ISourceVisibility;
  embeddings: number[];
  embeddingsUpdatedAt: Date;
  analysis?: ISourceAnalysis;
  references?: StringRecordId | any; // Allow any reference type to avoid circular dependency
  createdAt: Date;
  updatedAt: Date;
  viewedAt: Date;
};

export type ISourceForm = Omit<
  ISourceCreator,
  "createdAt" | "updatedAt" | "viewedAt" | "embeddings" | "embeddingsGeneratedAt"
>;

export type ISourceCreator = Omit<ISource, "id">;

export type ISourceAnalysis = {
  headline: string;
  abstract: string;
};

export type ISourceOutlineItem = {
  section: string;
  summary: string;
};

export type ISourceOwnership = {
  in: string | RecordId;
  out: string | RecordId;
  createdAt: Date;
};

export type ISourceForUser = {
  in: string | RecordId;
  out: string | RecordId;
  createdAt: Date;
};
