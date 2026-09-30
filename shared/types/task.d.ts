import { Duration, RecordId } from "surrealdb";
import type { IEmbeddingMetadata } from "./embeddings";

export type ITask = IEmbeddingMetadata & {
  id: string | RecordId;
  description: string;
  scratchpad: string;
  yState?: string | null;
  estimatedTime: Duration;
  dueDate: string | null;
  embeddings: number[];
  embeddingsUpdatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  viewedAt: Date;
  completedAt: Date | null;
};

export type IPublicTask = Omit<ITask, "embeddings">;

export type ITaskCreator = Omit<ITask, "id">;

export type ITaskForm = Omit<
  ITaskCreator,
  "embeddings" | "embeddingsUpdatedAt" | "createdAt" | "updatedAt" | "viewedAt"
>;

export type ITaskSortFields = "createdAt" | "updatedAt" | "completedAt" | "viewedAt" | "dueDate";

export type ITaskSortDirection = "desc" | "asc";

export type ITaskDurationBehavior =
  | "under"
  | "under-inclusive"
  | "over"
  | "over-inclusive"
  | "equals";

export type ITaskQuery = Partial<{
  sort?: {
    field: ITaskSortFields;
    direction: ITaskSortDirection;
  };
  duration?: {
    value: string;
    behavior: ITaskDurationBehavior;
  };
  dateRange?: {
    start?: string;
    end?: string;
  };
  limit?: number;
  start?: number;
}>;
