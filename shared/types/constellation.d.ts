import {
  IIdea,
  IIdeaConnection,
  IIdeaWithComputedFields,
  ISafeIdea,
} from "./idea";
import { IPublicUser } from "./user";
import { IUserFile } from "./userfile";
import { ITag, ITagDescriptionRelationship } from "./tag";
import { IExcerpt } from "./excerpt";
import { ISource } from "./source";
import { IPublicTask, ITask } from "./task";
import { IRabbithole, IRabbitholeInclusion } from "./rabbithole";
import { IShare } from "./share";
import { RecordId } from "surrealdb";

export type IConnectableTypes = "idea" | "source" | "task" | "excerpt";

export type IConnectable =
  | ((ISafeIdea | IIdea) & {
      type: "idea";
      direction?: "incoming" | "outgoing";
    })
  | ((ITask | IPublicTask) & {
      type: "task";
      direction?: "incoming" | "outgoing";
    })
  | (ISource & { type: "source"; direction?: "incoming" | "outgoing" })
  | (IExcerpt & { type: "excerpt"; direction?: "incoming" | "outgoing" });

export type ITaggedConnectable = IConnectable & {
  appliedTags: ITag[];
};

export type IPotentiallySharedConnectable = IConnectable & {
  author?: IPublicUser;
};

export type IConnectableTypeMap = {
  idea: IIdea;
  source: ISource;
  task: ITask | IPublicTask;
  excerpt: IExcerpt;
};

export type ISimilarConnectable = IConnectable & { similarity: number };

export type IConnection = {
  id: string | RecordId;
  in: string | RecordId;
  out: string | RecordId;
};

export type IGraphTagFilter = {
  set: string[];
  behavior: "and" | "or";
};

export type IGraphFilters = Partial<{
  rabbithole: string;
  scope?: string[];
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
  tags: IGraphTagFilter;
  showShared?: boolean;
  showFriends?: boolean;
}>;

export type IGetAllConnectables_SortOptions = Partial<{
  sortField: "createdAt" | "updatedAt" | "viewedAt";
  sortDirection: "ASC" | "DESC";
}>;

export type IGetAllConnectables_PaginationOptions = Partial<{
  limit: number;
  cursor: string;
}>;

export type IGetAllConnectables_Options =
  IGetAllConnectables_PaginationOptions &
    IGetAllConnectables_SortOptions & {
      filters?: IGraphFilters;
    };

export type IDBGraph = {
  ideas: (IIdea & { derivedList: IIdeaDerived[] })[];
  tags: ITag[];
  ideaConnections: IIdeaConnection[];
  tagConnections: ITagDescriptionRelationship[];
  files: IUserFile[];
  flags: {
    embeddings: {
      synced: boolean;
    };
  };
};

export type IDBGraphWithComputedFields = IDBGraph & {
  ideas: IIdeaWithComputedFields[];
};

export type ILoadedConstellation = Partial<{
  things: IConnectable[];
  rabbitholes: IRabbithole[];
  tags: ITag[];
  connections: IConnection[];
  inclusions: IRabbitholeInclusion[];
  descriptions: ITagDescriptionRelationship[];
  references: IVirtualExcerptReference[];
  friends: IPublicUser[];
  shares: IShare[];
}>;

export type IConstellationLoader = Partial<{
  things: boolean;
  rabbitholes: boolean;
  tags: boolean;
  connections: boolean;
  inclusions: boolean;
  descriptions: boolean;
  references: boolean;
  friends: boolean;
  shares: boolean;
}>;
