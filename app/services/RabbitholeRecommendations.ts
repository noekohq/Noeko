import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../database/db";
import { RabbitholeEvaluationJobModel } from "../database/models/rabbithole_evaluation_job";
import Rabbithole, {
  DEFAULT_RABBITHOLE_RECOMMENDATION_POLICY,
} from "../database/models/rabbithole";
import { IConnectable } from "../../shared/types/constellation";
import {
  IRabbithole,
  IRabbitholeActivity,
  IRabbitholeRecommendationPolicy,
  IRabbitholeSuggestion,
} from "../../shared/types/rabbithole";

type EmbeddableConnectable = IConnectable & { embeddings?: number[] };
type PersistedSuggestionRow = {
  out: EmbeddableConnectable;
  score?: number;
  reason?: string;
};

const describeAlignment = (score: number) => {
  if (score >= 0.85) return "Strong match to this Rabbithole’s current context";
  if (score >= 0.75) return "Good match to this Rabbithole’s current context";
  return "Possible match to this Rabbithole’s current context";
};

const cosineSimilarity = (left: number[], right: number[]) => {
  if (!left.length || left.length !== right.length) return 0;
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] ** 2;
    rightMagnitude += right[index] ** 2;
  }
  if (!leftMagnitude || !rightMagnitude) return 0;
  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
};

export default class RabbitholeRecommendations {
  public static async getAutoAddActivity(
    rabbitholeId: string | RecordId
  ): Promise<IRabbitholeActivity[]> {
    const db = await getDatabase();
    if (!db) throw new Error("Database not initialized");
    const [results] = await db.query<
      [
        Array<{
          out: EmbeddableConnectable;
          origin: "auto";
          similarity?: number;
          reason?: string;
          createdAt: Date;
        }>,
      ]
    >(
      `SELECT out, origin, similarity, reason, createdAt
       FROM includes
       WHERE in = $rabbitholeId AND origin = "auto"
       ORDER BY createdAt DESC
       LIMIT 30
       FETCH out;`,
      { rabbitholeId: new StringRecordId(rabbitholeId) }
    );
    return (results ?? []).map(({ out, origin, similarity, reason, createdAt }) => {
      const { embeddings: _embeddings, ...thing } = out;
      return {
        ...thing,
        type: thing.id.toString().split(":")[0],
        inclusionOrigin: origin,
        inclusionSimilarity: similarity,
        inclusionReason: reason,
        includedAt: createdAt,
      } as IRabbitholeActivity;
    });
  }

  public static async scheduleEvaluation(thingId: string | RecordId) {
    return RabbitholeEvaluationJobModel.enqueue(thingId);
  }

  public static async evaluateThingForOwners(thingId: string | RecordId) {
    const db = await getDatabase();
    if (!db) throw new Error("Database not initialized");
    const [owners] = await db.query<[Array<string | RecordId>]>(
      "SELECT VALUE <-owns.in FROM ONLY $thingId;",
      { thingId: new StringRecordId(thingId) }
    );
    const results = [];
    for (const ownerId of owners ?? []) {
      results.push(...(await this.evaluateThing(ownerId, thingId)));
    }
    return results;
  }

  private static policy(rabbithole: IRabbithole): IRabbitholeRecommendationPolicy {
    return rabbithole.recommendationPolicy ?? DEFAULT_RABBITHOLE_RECOMMENDATION_POLICY;
  }

  private static async hasDecision(rabbitholeId: string | RecordId, thingId: string | RecordId) {
    const db = await getDatabase();
    if (!db) throw new Error("Database not initialized");
    const [included, excluded] = await db.query<
      [Array<{ relation: string }>, Array<{ relation: string }>]
    >(
      `SELECT "included" AS relation FROM includes WHERE in = $rabbitholeId AND out = $thingId
       LIMIT 1;
       SELECT "excluded" AS relation FROM rabbithole_excludes
       WHERE in = $rabbitholeId AND out = $thingId LIMIT 1;`,
      {
        rabbitholeId: new StringRecordId(rabbitholeId),
        thingId: new StringRecordId(thingId),
      }
    );
    return included.length > 0 || excluded.length > 0;
  }

  private static async recommend(
    rabbitholeId: string | RecordId,
    thingId: string | RecordId,
    score: number,
    reason = describeAlignment(score)
  ) {
    const db = await getDatabase();
    if (!db) throw new Error("Database not initialized");
    const [existing] = await db.query<[Array<{ id: string | RecordId }>]>(
      "SELECT id FROM rabbithole_recommends WHERE in = $rabbitholeId AND out = $thingId LIMIT 1;",
      {
        rabbitholeId: new StringRecordId(rabbitholeId),
        thingId: new StringRecordId(thingId),
      }
    );
    if (existing.length) return existing[0];
    const [created] = await db.query<[Array<{ id: string | RecordId }>]>(
      `RELATE $rabbitholeId->rabbithole_recommends->$thingId CONTENT {
        score: $score,
        reason: $reason,
        createdAt: $now,
        updatedAt: $now
      };`,
      {
        rabbitholeId: new StringRecordId(rabbitholeId),
        thingId: new StringRecordId(thingId),
        score,
        reason,
        now: new Date(),
      }
    );
    return created[0];
  }

  public static async evaluateThing(userId: string | RecordId, thingId: string | RecordId) {
    const db = await getDatabase();
    if (!db) throw new Error("Database not initialized");

    const [thing] = await db.query<[EmbeddableConnectable | null]>("SELECT * FROM ONLY $thingId;", {
      thingId: new StringRecordId(thingId),
    });
    const thingType = thingId.toString().split(":")[0] as IConnectable["type"];
    if (!thing?.embeddings?.length) return [];

    const rabbitholes = (await Rabbithole.getAll(userId)) ?? [];
    const decisions = [];
    for (const rabbithole of rabbitholes) {
      const policy = this.policy(rabbithole);
      if (!policy.types.includes(thingType)) continue;
      if (!rabbithole.cachedCentroidEmbeddings?.length) continue;
      if (await this.hasDecision(rabbithole.id, thingId)) continue;

      const score = cosineSimilarity(thing.embeddings, rabbithole.cachedCentroidEmbeddings);
      if (score < policy.threshold) continue;

      if (policy.mode === "auto-add") {
        const reason = describeAlignment(score);
        const inclusion = await Rabbithole.addThing(rabbithole.id, thingId, {
          origin: "auto",
          similarity: score,
          reason,
        });
        decisions.push({ rabbitholeId: rabbithole.id, action: "included", score, inclusion });
      } else {
        const recommendation = await this.recommend(rabbithole.id, thingId, score);
        decisions.push({ rabbitholeId: rabbithole.id, action: "suggested", score, recommendation });
      }
    }
    return decisions;
  }

  public static async getPersistedSuggestions(
    rabbitholeId: string | RecordId
  ): Promise<IRabbitholeSuggestion[]> {
    const db = await getDatabase();
    if (!db) throw new Error("Database not initialized");
    const [results] = await db.query<[PersistedSuggestionRow[]]>(
      `SELECT out, score, reason
       FROM rabbithole_recommends
       WHERE in = $rabbitholeId
       ORDER BY score DESC
       FETCH out;`,
      { rabbitholeId: new StringRecordId(rabbitholeId) }
    );
    return (results ?? []).map(({ out, score, reason }) => {
      const { embeddings: _embeddings, ...suggestion } = out;
      const usefulReason =
        !reason || reason === "Semantic alignment" ? describeAlignment(score ?? 0) : reason;
      return {
        ...suggestion,
        type: suggestion.id.toString().split(":")[0],
        recommendationScore: score,
        recommendationReason: usefulReason,
      } as IRabbitholeSuggestion;
    });
  }

  public static async reconcile(
    userId: string | RecordId,
    rabbitholeId: string | RecordId,
    options: { limit?: number } = {}
  ): Promise<IRabbitholeSuggestion[]> {
    const rabbithole = await Rabbithole.get(rabbitholeId);
    if (!rabbithole) throw new Error("Rabbithole not found");
    const policy = this.policy(rabbithole);
    const candidates =
      (await Rabbithole.getSimilarThings(userId, rabbitholeId, {
        limit: options.limit ?? 30,
        threshold: policy.threshold,
      })) ?? [];

    for (const candidate of candidates) {
      const type = candidate.id.toString().split(":")[0] as IConnectable["type"];
      if (!policy.types.includes(type)) continue;
      if (await this.hasDecision(rabbitholeId, candidate.id)) continue;
      const score = "similarity" in candidate ? Number(candidate.similarity) : policy.threshold;
      if (policy.mode === "auto-add") {
        const reason = describeAlignment(score);
        await Rabbithole.addThing(rabbitholeId, candidate.id, {
          origin: "auto",
          similarity: score,
          reason,
        });
      } else {
        await this.recommend(rabbitholeId, candidate.id, score);
      }
    }
    return this.getPersistedSuggestions(rabbitholeId);
  }

  public static async accept(rabbitholeId: string | RecordId, thingId: string | RecordId) {
    const db = await getDatabase();
    if (!db) throw new Error("Database not initialized");
    const [recommendation] = await db.query<[Array<{ score?: number; reason?: string }>]>(
      "SELECT score, reason FROM rabbithole_recommends WHERE in = $rabbitholeId AND out = $thingId LIMIT 1;",
      {
        rabbitholeId: new StringRecordId(rabbitholeId),
        thingId: new StringRecordId(thingId),
      }
    );
    const result = await Rabbithole.addThing(rabbitholeId, thingId, {
      origin: "accepted-suggestion",
      similarity: recommendation[0]?.score,
      reason: recommendation[0]?.reason,
    });
    await db.query("DELETE rabbithole_recommends WHERE in = $rabbitholeId AND out = $thingId;", {
      rabbitholeId: new StringRecordId(rabbitholeId),
      thingId: new StringRecordId(thingId),
    });
    return result;
  }

  public static async dismiss(rabbitholeId: string | RecordId, thingId: string | RecordId) {
    const db = await getDatabase();
    if (!db) throw new Error("Database not initialized");
    await db.query(
      `DELETE rabbithole_recommends WHERE in = $rabbitholeId AND out = $thingId;
       RELATE $rabbitholeId->rabbithole_excludes->$thingId CONTENT {
         createdAt: $now,
         reason: "dismissed"
       };`,
      {
        rabbitholeId: new StringRecordId(rabbitholeId),
        thingId: new StringRecordId(thingId),
        now: new Date(),
      }
    );
  }
}
