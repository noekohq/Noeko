import { StringRecordId } from "surrealdb";
import { z } from "zod";

export function validateSurrealRecordId(recordId: string) {
  try {
    const newId = new StringRecordId(recordId);
    if (!newId) {
      return false;
    }
  } catch (error) {
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
