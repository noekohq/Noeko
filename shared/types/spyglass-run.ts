import type { IFinding, ISpyglassHistoryItem, ISpyglassIntent } from "../../app/services/Spyglass";
import type { IConnectable, IConnectableFields } from "../../app/services/Graph";
import type { IGraphFilters } from "./constellation";
import type { StringRecordId } from "surrealdb";

export type SpyglassRunStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export type SpyglassRunPhase =
  | "queued"
  | "starting"
  | "intent"
  | "retrieval"
  | "findings"
  | "overview"
  | "completed"
  | "failed"
  | "cancelled";

export type SpyglassRunConfiguration = {
  scope?: string[];
  rabbithole?: string;
  tags?: IGraphFilters["tags"];
  date?: {
    createdAt?: { after?: string; before?: string };
    updatedAt?: { after?: string; before?: string };
  };
  history?: ISpyglassHistoryItem[];
};

export type SpyglassRunEventType =
  | "reset"
  | "status"
  | "intent_loaded"
  | "resources_loaded"
  | "full_results_loaded"
  | "findings_chunk"
  | "overview_chunk"
  | "completed"
  | "error"
  | "cancelled";

export type SpyglassRun = {
  id: StringRecordId;
  userId: StringRecordId;
  query: string;
  profile: "deep_focus";
  configuration: SpyglassRunConfiguration;
  status: SpyglassRunStatus;
  phase: SpyglassRunPhase;
  cancellationRequested: boolean;
  attempt: number;
  lastEventSequence: number;
  overview: string;
  findings: IFinding[];
  resources: IConnectableFields[];
  fullResults: IConnectable[];
  intent?: ISpyglassIntent;
  error?: string;
  leaseOwner?: string;
  leaseExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  cancelledAt?: Date;
};

export type SpyglassRunEvent = {
  id: StringRecordId;
  runId: StringRecordId;
  sequence: number;
  type: SpyglassRunEventType;
  data: unknown;
  createdAt: Date;
};

export type CreateSpyglassRunInput = {
  userId: string;
  query: string;
  configuration: SpyglassRunConfiguration;
};
