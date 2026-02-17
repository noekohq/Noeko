import { RecordId, StringRecordId } from "surrealdb";
import { IPublicUser, ISafeUser, IUser } from "./user";
import { IUserFile } from "./userfile";
import { ITag, ITagDescriptionRelationship } from "./tag";

export type IIdea = {
  id: string | RecordId;
  title: string;
  content: string;
  contentPlain?: string;
  yState?: string;
  embeddings: number[] | null;
  visibility: IIdeaVisibility;
  createdAt: Date;
  updatedAt: Date;
  viewedAt: Date;
  contentUpdatedAt: Date;
  contentPlainUpdatedAt: Date;
  embeddingsUpdatedAt: Date;
  titleGeneratedAt?: Date;
  connections?: IIdea[];
  relatedIdeas?: IIdeaAsRelation[];
  derived?: IIdeaDerivedMap;
  similar?: IIdeaAsRelation[];
  importedAt?: Date;
  author?: IPublicUser;
};

export type IIdeaVisibility = "private" | "public";

export type IIdeaWithComputedFields = (IIdea | ISafeIdea) & {
  embeddingsOutOfDate: boolean;
};

export type IIdeaAsRelation = ISafeIdea & {
  distance: number;
  derivedList: IIdeaDerived[];
};

export type IIdeaForm = Omit<
  IIdea,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "viewedAt"
  | "contentUpdatedAt"
  | "contentPlainUpdatedAt"
  | "embeddingsUpdatedAt"
>;

export type IIdeaConnection = {
  id: string;
  in: string;
  out: string;
};

export type IDerivedType = "generative_summary";
export type IIdeaDerived = IGenerativeSummary;

export type IIdeaDerivedMap = {
  generative_summary?: IGenerativeSummary;
};

export type IIdeaUserOwnership = {
  id: string;
  in: string;
  out: string;
};

export type IUserIdeaStats = {
  total: number;
};

export type ISafeIdea = Omit<IIdea, "embeddings">;

export type IViewOnlyIdea = Pick<ISafeIdea, "id" | "title" | "content" | "createdAt" | "updatedAt">;

export type IIdeaSortFields = "createdAt" | "updatedAt" | "viewedAt";
export type IIdeaQuery = Partial<{
  sort?: {
    field: IIdeaSortFields;
    direction: "desc" | "asc";
  };
  limit?: number;
  start?: number;
}>;

export type IGenerativeSummary = {
  id: RecordId;
  createdAt: Date;
  sentenceOverview: string;
  sentenceSummary: string;
  paragraphOverview?: string;
  paragraphSummary?: string;
  abstractSummary?: string;
  simplifiedSummary?: string;
  outline?: string[];
  keyPoints?: string[];
  highlights?: string[];
  questions?: string[];
  tasks?: string[];
};

export type IGenerativeSummaryForm = Omit<IGenerativeSummary, "id" | "createdAt">;
