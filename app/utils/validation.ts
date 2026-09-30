import { StringRecordId } from "surrealdb";
import { z } from "zod";

export function validateSurrealRecordId(recordId: string) {
  try {
    const newId = new StringRecordId(recordId);
    if (!newId) {
      return false;
    }
  } catch {
    return false;
  }
}

export const RecordIdSchema = z.string();

export const ConnectableTypesSchema = z.enum(["idea", "excerpt", "task", "source"]);

export const GraphTagFilterSchema = z.object({
  set: z.array(z.string()),
  behavior: z.enum(["and", "or"]),
});

export const ConnectableSearchQueryVectorSettingsSchema = z.object({
  effort: z.union([z.number().positive(), z.enum(["low", "mid", "high"])]).optional(),
  threshold: z.number().min(0).max(1).optional(),
});
export const DateRangeSchema = z.object({
  after: z.string().datetime().optional(),
  before: z.string().datetime().optional(),
});

export const GraphFiltersSchema = z.object({
  rabbithole: z.string().optional(),
  date: z
    .object({
      createdAt: DateRangeSchema.optional(),
      updatedAt: DateRangeSchema.optional(),
      viewedAt: DateRangeSchema.optional(),
    })
    .optional(),
  tags: GraphTagFilterSchema.optional(),
  showShared: z.boolean().optional(),
  showFriends: z.boolean().optional(),
});

export const ConnectableSearchQuerySchema = z.object({
  query: z.string(),
  filters: GraphFiltersSchema.optional(),
  tables: z.array(ConnectableTypesSchema).optional(),
  limit: z.number().int().positive().optional(),
  searchType: z
    .object({
      fts: z.boolean(),
      vector: z.boolean(),
    })
    .optional(),
  vectorSettings: ConnectableSearchQueryVectorSettingsSchema.optional(),
});

const SpyglassHistoryItemSchema = z.object({
  query: z.string().max(10_000),
  intent: z.string().max(10_000),
  response: z.string().max(1_000_000),
});

export const SpyglassStreamRequestSchema = z.object({
  query: z.string().trim().min(1).max(10_000),
  scope: z.array(z.string().min(1)).max(500).optional(),
  deepAnalysis: z.boolean(),
  rabbithole: z.string().min(1).optional(),
  tags: GraphTagFilterSchema.optional(),
  date: z
    .object({
      createdAt: DateRangeSchema.optional(),
      updatedAt: DateRangeSchema.optional(),
    })
    .optional(),
  history: z.array(SpyglassHistoryItemSchema).max(50).optional(),
});

export const SpyglassRunCreateRequestSchema = SpyglassStreamRequestSchema;

export const SpyglassSaveRequestSchema = z.object({
  baseQuery: z.string().trim().min(1).max(10_000),
  scope: z.array(z.string().min(1)).max(500),
  searchPerformed: z.boolean(),
  isDeepAnalysis: z.boolean(),
  intent: z.unknown().optional(),
  results: z.array(z.unknown()).optional(),
  findings: z.array(z.unknown()).max(10_000).optional(),
  overview: z.string().max(2_000_000),
});
