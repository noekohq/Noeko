import { RecordId } from "surrealdb";
import { IConnectable } from "./constellation";
import { ITag } from "./tags";

export type IRabbitholeIncludes = IConnectable | (ITag & { type: "tag" });

export type IRabbitholeRecommendationMode = "suggest" | "auto-add";

export type IRabbitholeRecommendationPolicy = {
  mode: IRabbitholeRecommendationMode;
  threshold: number;
  types: Array<"idea" | "task" | "source" | "excerpt">;
};

export type IRabbitholeInclusionOrigin = "manual" | "accepted-suggestion" | "auto";

export type IRabbithole = {
  id: string | RecordId;
  name: string;
  description?: string;
  nameGeneratedAt?: Date;
  descriptionGeneratedAt?: Date;
  contentSummary?: string;
  includes?: IRabbitholeIncludes[];
  cachedCentroidEmbeddings?: number[];
  recommendationPolicy?: IRabbitholeRecommendationPolicy;
  createdAt: Date;
  updatedAt: Date;
};

export type IRabbitholeCreator = Omit<IRabbithole, "id" | "includes">;

export type IRabbitholeForm = Omit<IRabbitholeCreator, "createdAt" | "updatedAt">;

export type IRabbitholeInclusion = {
  id: string | RecordId;
  in: string | RecordId;
  out: string | RecordId;
  origin?: IRabbitholeInclusionOrigin;
  similarity?: number;
  reason?: string;
  createdAt: Date;
};

export type IRabbitholeSuggestion = IConnectable & {
  recommendationScore?: number;
  recommendationReason?: string;
};

export type IRabbitholeActivity = IConnectable & {
  inclusionOrigin: IRabbitholeInclusionOrigin;
  inclusionSimilarity?: number;
  inclusionReason?: string;
  includedAt: Date;
};
