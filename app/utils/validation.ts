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

export const ConnectableTypesSchema = z.enum([
  "idea",
  "excerpt",
  "task",
  "source",
]);

export const ConnectableSearchQueryTagFilterSchema = z.object({
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
});

export const ConnectableSearchQueryVectorSettingsSchema = z.object({
  threshold: z.number().min(0).max(1).optional(),
});
export const DateRangeSchema = z.object({
  after: z.iso.datetime().optional(),
  before: z.iso.datetime().optional(),
});
export const ConnectableSearchQuerySchema = z
  .object({
    query: z.string(),
  })
  .extend(
    z.object({
      tables: z.array(ConnectableTypesSchema).optional(),
      limit: z.number().int().positive().optional(),
      rabbithole: z.union([z.string(), RecordIdSchema]).optional(),
      tags: ConnectableSearchQueryTagFilterSchema.optional(),
      searchType: z
        .object({
          fts: z.boolean(),
          vector: z.boolean(),
        })
        .optional(),
      date: z
        .object({
          createdAt: DateRangeSchema.optional(),
          updatedAt: DateRangeSchema.optional(),
          viewedAt: DateRangeSchema.optional(),
        })
        .optional(),
      vectorSettings: ConnectableSearchQueryVectorSettingsSchema.optional(),
    }).shape,
  );
