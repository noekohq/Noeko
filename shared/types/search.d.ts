import { RecordId } from "surrealdb";
import { IIdea, ISafeIdea } from "../../app/database/models/ideas";
import { ITag } from "../../app/database/models/tag";
import { IRabbithole } from "../../app/database/models/rabbithole";
import { IPublicTask, ITask } from "../../app/database/models/task";
import { IExcerpt } from "../../app/database/models/excerpt";
import {
  IConnectable,
  IConnectableTypes,
  ISharedConnectable,
} from "../../app/services/Graph";
import { ISource } from "../../app/database/models/source";

export type ISearchResultValue = IConnectable | ISharedConnectable;

export type ISearchResult = {
  id: string | RecordId;
  score: number;
  value: ISearchResultValue;
  highlightText?: string;
  debug?: {
    semanticScore?: number;
    ftsContentScore?: number;
    ftsTitleScore?: number;
    exactTitleBonus?: number;
    source: "semantic" | "fts" | "hybrid";
  };
};

export type IFTSIdeaResult = ISafeIdea & {
  contentScore: number;
  titleScore: number;
  preview: string;
};

export type IFTSTaskResult = IPublicTask & {
  descriptionScore: number;
  scratchpadScore: number;
  preview: string;
};

export type IFTSSourceResult = ISource & {
  contentScore: number;
  displayNameScore: number;
  preview: string;
};

export type IFTSExcerptResult = IExcerpt & {
  noteScore: number;
  sourceTextScore: number;
  preview: string;
};

export type IFTSResult =
  | (IFTSIdeaResult & {
      preview?: string;
    })
  | (IFTSTaskResult & {
      preview?: string;
    })
  | (IFTSSourceResult & {
      preview?: string;
    })
  | (IFTSExcerptResult & {
      preview?: string;
    });

export type ISemanticIdeaResult = IIdea & { similarity: number };
export type ISemanticTaskResult = ITask & { similarity: number };
export type ISemanticSourceResult = ISource & { similarity: number };
export type ISemanticExcerptResult = IExcerpt & { similarity: number };

export type ISemanticResult =
  | ISemanticIdeaResult
  | ISemanticTaskResult
  | ISemanticSourceResult
  | ISemanticExcerptResult;

export type ITagSearchResultValue = ITag;

export type ITagSearchResult = {
  id: string | RecordId;
  value: ITagSearchResultValue;
  score: number;
  searchType: "fts" | "semantic" | "comprehensive";
};

export type IRabbitholeSearchResultValue = IRabbithole;

export type IRabbitholeSearchResult = {
  id: string | RecordId;
  value: IRabbitholeSearchResultValue;
  score: number;
  searchType: "fts" | "semantic" | "comprehensive";
};

export type ITaskSearchResultValue = ITask;

export type ITaskSearchResult = {
  id: string | RecordId;
  value: ITaskSearchResultValue;
  score: number;
  searchType: "fts" | "semantic" | "comprehensive";
};

export type IExcerptSearchResultValue = Omit<IExcerpt, "embeddings">;

export type IExcerptSearchResult = {
  score: number;
  result: IExcerptSearchResultValue;
  search_type?: "fts" | "semantic";
};

export type ISearchableTable =
  | "task"
  | "idea"
  | "source"
  | "excerpt"
  | "rabbithole"
  | "tag";

export type IConnectableSearchQueryTagFilter = {
  set: (string | RecordId)[];
  behavior: "and" | "or";
};

export type IConnectableSearchQueryVectorSettings = {
  effort: number | "low" | "mid" | "high";
};

export type IConnectableSearchQuery = { query: string } & Partial<{
  tables: IConnectableTypes[];
  limit: number;
  rabbithole: string | RecordId;
  tags?: IConnectableSearchQueryTagFilter;
  searchType: {
    fts: boolean;
    vector: boolean;
  };
  date: {
    createdAt?: {
      after?: string;
      before?: string;
    };
    updatedAt?: {
      after?: string;
      before?: string;
    };
    viewedAt?: {
      after?: string;
      before?: string;
    };
  };
  vectorSettings?: IConnectableSearchQueryVectorSettings;
  scope?: string[];
}>;
