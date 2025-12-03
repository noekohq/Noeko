import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../database/db";
import { getEmbedder } from "../ai/embeddings/embeddings";
import { Connectable, IConnectable, IConnectableTypes } from "./Graph";

// Import Models
import { ITask } from "../database/models/task";
import { IRabbithole } from "../database/models/rabbithole";
import { IIdea } from "../database/models/ideas";
import { ISource } from "../database/models/source";
import { IExcerpt } from "../database/models/excerpt";

// Import Search Infrastructure
import { ConnectableTableSearchBuilder, ISearchResult } from "./Search";
import { default_embeddings_dimension } from "../settings";

// --- 1. INTERFACES & TYPES ---

type ITaskWithDiff = ITask & {
  daysDiff: number; // duration::days(dueDate - now)
};

type IRabbitholeWithDecay = IRabbithole & {
  daysAgo: number; // duration::days(now - updatedAt)
};

type IAnchorItem = {
  embeddings: number[] | undefined;
  updatedAt: string;
};

interface IRecommendationItem {
  id: string;
  title: string;
  internalScore: number;
  context: {
    label: string;
    reason: string;
  };
}

interface IAcceleratorItemBase extends IRecommendationItem {
  context: {
    label: string;
    reason: string;
    urgency?: "critical" | "high" | "normal" | "low";
  };
}

export type IAcceleratorItem = IAcceleratorItemBase &
  (
    | { type: "urgentTask"; payload: ITaskWithDiff }
    | { type: "activeRabbithole"; payload: IRabbitholeWithDecay }
    | { type: "idea"; payload: IIdea }
    | { type: "source"; payload: ISource }
    | { type: "task"; payload: ITask }
    | { type: "excerpt"; payload: IExcerpt }
  );

export type IRecommendationShelf =
  | "urgent"
  | "pins"
  | "rabbitholes"
  | "recent"
  | string;

export type IRecommendation = IAcceleratorItem & {
  shelf: IRecommendationShelf;
};

export interface IShelfData {
  id: string;
  inherentWeight: number;
  items: IAcceleratorItem[];
  totalShelfScore?: number;
}

// --- 2. THE SERVICE CLASS ---

export default class Recommendations {
  private static readonly ANCHOR_LIMIT = 15;
  private static readonly DECAY_FACTOR = 0.9;

  // Shelf Weights
  private static readonly WEIGHT_URGENT = 1.5;
  private static readonly WEIGHT_PINS = 1.1;
  private static readonly WEIGHT_RABBITHOLES = 1.2;
  private static readonly WEIGHT_DISCOVERY = 0.9;
  private static readonly WEIGHT_RECENT = 0.7;

  // Context Weights (How much does vector similarity matter?)
  // 0.0 = Ignored, 1.0 = dominates the score
  private static readonly RELEVANCE_WEIGHT_TASK = 0.3;
  private static readonly RELEVANCE_WEIGHT_RECENT = 0.6;
  private static readonly RELEVANCE_WEIGHT_PINS = 0.4;

  private static async db() {
    const db = await getDatabase();
    if (!db)
      throw new Error(
        "Database connection unavailable in Recommendations Service",
      );
    return db;
  }

  // --- PHASE 3: AGGREGATOR ---
  public static async getAcceleratorFeed(
    userId: string | RecordId,
  ): Promise<IShelfData[]> {
    const userRecordId = new StringRecordId(userId);

    // 1. Get Context (Anchor + Active Tags)
    const [temporalAnchor, tagClusters] = await Promise.all([
      this.getTemporalAnchor(userRecordId),
      this.getActiveTagClusters(userRecordId),
    ]);

    // 2. Run Strategies (Passing the Anchor to all of them)
    const [
      urgentTasks,
      activeRabbitholes,
      pinnedItems,
      recentActivity,
      tagShelves,
    ] = await Promise.all([
      this.strategyUrgentTasks(userRecordId, temporalAnchor),
      this.strategyActiveRabbitholes(userRecordId, temporalAnchor),
      this.strategyPinnedItems(userRecordId, temporalAnchor),
      this.strategyRecentActivity(userRecordId, temporalAnchor),
      this.strategyTagExploration(userRecordId, temporalAnchor, tagClusters),
    ]);

    // 3. Define Static Shelves
    const shelves: IShelfData[] = [
      {
        id: "urgent",
        inherentWeight: this.WEIGHT_URGENT,
        items: urgentTasks,
      },
      {
        id: "rabbitholes",
        inherentWeight: this.WEIGHT_RABBITHOLES,
        items: activeRabbitholes,
      },
      {
        id: "pins",
        inherentWeight: this.WEIGHT_PINS,
        items: pinnedItems,
      },
      {
        id: "recent",
        inherentWeight: this.WEIGHT_RECENT,
        items: recentActivity,
      },
      ...tagShelves,
    ];

    // 4. Score Shelves
    const scoredShelves = shelves.map((shelf) => {
      if (shelf.items.length === 0) return { ...shelf, totalShelfScore: 0 };
      const maxItemScore = Math.max(...shelf.items.map((i) => i.internalScore));
      return { ...shelf, totalShelfScore: maxItemScore * shelf.inherentWeight };
    });

    // 5. Sort Shelves
    scoredShelves.sort(
      (a, b) => (b.totalShelfScore || 0) - (a.totalShelfScore || 0),
    );

    // 6. De-dupe Items
    const seenIds = new Set<string>();
    const finalFeed: IShelfData[] = [];

    for (const shelf of scoredShelves) {
      const freshItems = shelf.items.filter((item) => !seenIds.has(item.id));

      if (freshItems.length > 0) {
        freshItems.forEach((item) => seenIds.add(item.id));
        freshItems.sort((a, b) => b.internalScore - a.internalScore);
        finalFeed.push({ ...shelf, items: freshItems });
      }
    }

    return finalFeed;
  }

  // --- PHASE 2: STRATEGIES ---

  /**
   * STRATEGY: DYNAMIC TAG EXPLORATION
   * Already context-heavy. Remains mostly the same, just tuned.
   */
  private static async strategyTagExploration(
    userId: StringRecordId,
    anchorVector: number[],
    tagIds: string[],
  ): Promise<IShelfData[]> {
    if (!anchorVector?.length || !tagIds?.length) return [];

    const shelves: IShelfData[] = [];

    await Promise.all(
      tagIds.map(async (tagId) => {
        try {
          const [tagInfo] = await this.db().then((db) =>
            db.query<[{ name: string }[]]>(`SELECT name FROM ONLY ${tagId}`),
          );
          const tagName = tagInfo?.[0]?.name || "Topic";

          const builders = [
            new ConnectableTableSearchBuilder({
              table: "idea",
              userId,
              searchQuery: {
                query: "",
                tags: { set: [tagId], behavior: "or" },
                limit: 3,
                vectorSettings: { effort: "low" },
              },
            }),
            new ConnectableTableSearchBuilder({
              table: "source",
              userId,
              searchQuery: {
                query: "",
                tags: { set: [tagId], behavior: "or" },
                limit: 3,
                vectorSettings: { effort: "low" },
              },
            }),
          ];

          const resultsNested = await Promise.all(
            builders.map((b) => b.searchVector(anchorVector)),
          );

          const combinedResults = resultsNested
            .flat()
            .filter((r): r is ISearchResult => !!r);

          if (combinedResults.length > 0) {
            combinedResults.sort((a, b) => b.score - a.score);

            const items = combinedResults
              .slice(0, 5)
              .map((res) =>
                this.mapSearchResultToAcceleratorItem(
                  res,
                  `Relevant in ${tagName}`,
                ),
              );

            shelves.push({
              id: `tag-${tagId}`,
              inherentWeight: this.WEIGHT_DISCOVERY,
              items: items,
            });
          }
        } catch (e) {
          console.error(`Error processing tag shelf ${tagId}`, e);
        }
      }),
    );

    return shelves;
  }

  /**
   * STRATEGY: RECENT ACTIVITY
   * Heavily influenced by Context.
   * Instead of pure chronology, it's Chronology * Relevance.
   */
  private static async strategyRecentActivity(
    userId: StringRecordId,
    anchorVector: number[],
  ): Promise<IAcceleratorItem[]> {
    const db = await this.db();

    // Fetch recent items, INCLUDING embeddings
    const query = `
      SELECT *, embeddings FROM idea, source, task, excerpt
      WHERE <-owns<-(user WHERE id = $userId)
      AND updatedAt != NONE
      ORDER BY updatedAt DESC
      LIMIT 15;
    `;

    const [results] = await db.query<
      [(IConnectable & { embeddings: number[] })[]]
    >(query, { userId });
    const rawItems = results || [];

    const items = rawItems
      .map((i): IAcceleratorItem | null => {
        const type = Connectable.idToType(i.id.toString());
        const fields = type
          ? Connectable.fieldsResolver[type](i as any)
          : undefined;
        if (!fields || !type) return null;

        // 1. Calculate Freshness (0.0 - 1.0 based on time)
        const hoursSinceUpdate =
          (Date.now() - new Date(i.updatedAt).getTime()) / (1000 * 60 * 60);
        const freshnessScore = Math.max(0.1, 1.0 - hoursSinceUpdate / 72); // 3 day window

        // 2. Calculate Context Relevance (0.0 - 1.0 based on vector)
        const contextScore = this.calculateRelevance(
          i.embeddings,
          anchorVector,
        );

        // 3. Blend Scores
        // We weigh relevance heavily here. A slightly older item that is highly relevant
        // should beat a brand new item that is totally irrelevant.
        const finalScore =
          freshnessScore * (1 - this.RELEVANCE_WEIGHT_RECENT) +
          contextScore * this.RELEVANCE_WEIGHT_RECENT;

        return this.buildAcceleratorItem(i, type, fields?.name, finalScore, {
          label: "Recent & Relevant",
          reason: "Recently active in this context",
          urgency: "low",
        });
      })
      .filter((i) => !!i);

    return items;
  }

  /**
   * STRATEGY: URGENT TASKS
   * Urgent is Urgent, but Context breaks ties.
   */
  private static async strategyUrgentTasks(
    userId: StringRecordId,
    anchorVector: number[],
  ): Promise<IAcceleratorItem[]> {
    const db = await this.db();

    // Need to fetch embeddings for context check
    const query = `
      SELECT *, embeddings, duration::days(dueDate - time::now()) as daysDiff
      FROM task
      WHERE
        <-owns<-(user WHERE id = $userId)
        AND completedAt = NONE
        AND dueDate != NONE
        AND dueDate < time::now() + 7d
      ORDER BY dueDate ASC
    `;

    const [results] = await db.query<[ITaskWithDiff[]]>(query, { userId });
    const tasks = results || [];

    return tasks.map((t): IAcceleratorItem => {
      const daysDiff = t.daysDiff;
      let urgencyScore = 0.5;
      let label = "Upcoming";
      let urgency: IAcceleratorItem["context"]["urgency"] = "normal";

      if (daysDiff < 0) {
        urgencyScore = 1.0;
        label = "Overdue";
        urgency = "critical";
      } else if (daysDiff < 1) {
        urgencyScore = 0.95;
        label = "Due Today";
        urgency = "high";
      } else if (daysDiff < 2) {
        urgencyScore = 0.8;
        label = "Due Tomorrow";
        urgency = "high";
      }

      // Calculate Context Relevance
      const contextScore = this.calculateRelevance(t.embeddings, anchorVector);

      // Blend: Urgency is dominant (70%), but context (30%) can bump a relevant task up
      const finalScore =
        urgencyScore * (1 - this.RELEVANCE_WEIGHT_TASK) +
        contextScore * this.RELEVANCE_WEIGHT_TASK;

      return {
        id: t.id.toString(),
        title: t.description || "Untitled Task",
        type: "urgentTask",
        internalScore: finalScore,
        payload: t,
        context: { label, urgency, reason: "Deadline approaching" },
      };
    });
  }

  /**
   * STRATEGY: ACTIVE RABBITHOLES
   * Rabbitholes are containers. We score them based on their embeddings (if we have them on the record)
   * or we could infer based on content, but sticking to the record embedding is faster.
   */
  private static async strategyActiveRabbitholes(
    userId: StringRecordId,
    anchorVector: number[],
  ): Promise<IAcceleratorItem[]> {
    const db = await this.db();

    // Note: Assuming Rabbitholes have embeddings here. If not, this will default to 0 relevance.
    const query = `
      SELECT *, duration::days(time::now() - updatedAt) as daysAgo
      FROM rabbithole
      WHERE
        <-owns<-(user WHERE id = $userId)
        AND updatedAt > time::now() - 14d
      ORDER BY updatedAt DESC
    `;

    const [results] = await db.query<[IRabbitholeWithDecay[]]>(query, {
      userId,
    });
    const holes = results || [];

    return holes.map((h): IAcceleratorItem => {
      // Recency Score
      const recencyScore = Math.max(0, 1 - h.daysAgo / 14);

      // Relevance Score
      // Rabbitholes are high-context items. If I'm working on "AI", the "AI" rabbithole should pop.
      const relevanceScore = this.calculateRelevance(
        h.cachedCentroidEmbeddings,
        anchorVector,
      );

      // Blend: 50/50. Even if I haven't touched it in 5 days, if it matches my EXACT current thought, show it.
      const finalScore = recencyScore * 0.5 + relevanceScore * 0.5;

      return {
        id: h.id.toString(),
        title: h.name,
        type: "activeRabbithole",
        internalScore: finalScore,
        payload: h,
        context: {
          label: "Active Project",
          reason: "Relevance to current context",
          urgency: "normal",
        },
      };
    });
  }

  /**
   * STRATEGY: PINNED ITEMS
   * Pins are manual overrides, but we can still sort them by relevance.
   */
  private static async strategyPinnedItems(
    userId: StringRecordId,
    anchorVector: number[],
  ): Promise<IAcceleratorItem[]> {
    const db = await this.db();
    const query = `
      SELECT *, embeddings FROM idea, task, source, excerpt
      WHERE <-pins<-(user WHERE id = $userId)
    `;

    const [results] = await db.query<
      [(IConnectable & { embeddings: number[] })[]]
    >(query, { userId });
    const rawItems = results || [];

    return rawItems.map((i): IAcceleratorItem => {
      const connectable = new Connectable(i.id.toString());
      const type = connectable.type;
      const fields = Connectable.fieldsResolver[type](i as any);

      // Base score is high because it's pinned
      const baseScore = 1.0;

      // Context adjusts it slightly to order them
      const contextScore = this.calculateRelevance(i.embeddings, anchorVector);

      // If context is 1.0, score is 1.0. If context is 0, score is 0.6 (still high, but lower)
      const finalScore = baseScore * (0.6 + contextScore * 0.4);

      let title = fields.name;

      return this.buildAcceleratorItem(i, type, title, finalScore, {
        label: "Pinned",
        reason: "Pinned by you",
        urgency: "high",
      });
    });
  }

  // --- PHASE 1: ANCHORS ---

  public static async getTemporalAnchor(
    userId: StringRecordId,
  ): Promise<number[]> {
    const db = await this.db();

    // Look back 15 items to get a broader "session" context
    const query = `
      SELECT embeddings, updatedAt FROM idea, task, source, excerpt
      WHERE
        <-owns<-(user WHERE id = $userId)
        AND embeddings != NONE
      ORDER BY updatedAt DESC
      LIMIT $limit;
    `;

    const [results] = await db.query<[IAnchorItem[]]>(query, {
      userId,
      limit: this.ANCHOR_LIMIT,
    });

    const items = results;

    if (!items || items.length === 0) {
      return getEmbedder().getEmptyEmbeddings();
    }

    return this.calculateDecayedCentroid(items);
  }

  public static async getActiveTagClusters(
    userId: StringRecordId,
  ): Promise<string[]> {
    const db = await this.db();
    const query = `
      SELECT count() as freq, id FROM tag
      WHERE ->describes->(
        ? WHERE
          (count(<-owns[WHERE in = $userId]) > 0)
          AND updatedAt > time::now() - 2d
      )
      GROUP BY id
      ORDER BY freq DESC
      LIMIT 3
    `;

    const [results] = await db.query<[{ id: string }[]]>(query, { userId });
    const tagIds = results || [];

    return tagIds.map((t) => t.id.toString());
  }

  // --- MATH HELPERS ---

  /**
   * Calculates Cosine Similarity between an item's embedding and the Anchor.
   * Returns 0 if vectors are missing.
   */
  private static calculateRelevance(
    itemVector: number[] | undefined,
    anchorVector: number[],
  ): number {
    if (
      !itemVector ||
      !anchorVector ||
      itemVector.length !== anchorVector.length
    ) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < itemVector.length; i++) {
      dotProduct += itemVector[i] * anchorVector[i];
      normA += itemVector[i] * itemVector[i];
      normB += anchorVector[i] * anchorVector[i];
    }

    if (normA === 0 || normB === 0) return 0;

    // Ensure result is between 0 and 1
    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return Math.max(0, similarity);
  }

  private static calculateDecayedCentroid(items: IAnchorItem[]): number[] {
    if (items.length === 0) return [];

    const vectorSize =
      items[0].embeddings?.length || default_embeddings_dimension;
    const centroid = new Array(vectorSize).fill(0);
    let totalWeight = 0;

    items.forEach((item, index) => {
      const weight = Math.pow(this.DECAY_FACTOR, index);
      totalWeight += weight;
      for (let i = 0; i < vectorSize; i++) {
        if (item.embeddings) {
          centroid[i] += item.embeddings[i] * weight;
        }
      }
    });

    if (totalWeight > 0) {
      for (let i = 0; i < vectorSize; i++) {
        centroid[i] = centroid[i] / totalWeight;
      }
    }

    return centroid;
  }

  private static mapSearchResultToAcceleratorItem(
    res: ISearchResult,
    reason: string,
  ): IAcceleratorItem {
    const i = res.value;
    const typeString = i.type as IConnectableTypes;

    let title = "Untitled";
    if (typeString === "idea") title = (i as IIdea).title;
    else if (typeString === "source") title = (i as ISource).displayName;
    else if (typeString === "excerpt") title = (i as IExcerpt).note;
    else if (typeString === "task") title = (i as ITask).description;

    return this.buildAcceleratorItem(i, typeString, title, res.score, {
      label: "Rediscover",
      reason: reason,
      urgency: "low",
    });
  }

  private static buildAcceleratorItem(
    payload: any,
    type: IConnectableTypes,
    title: string,
    score: number,
    context: IAcceleratorItem["context"],
  ): IAcceleratorItem {
    const baseProps = {
      id: payload.id.toString(),
      title: title || "Untitled",
      internalScore: score,
      context,
    };

    switch (type) {
      case "idea":
        return { ...baseProps, type: "idea", payload };
      case "source":
        return { ...baseProps, type: "source", payload };
      case "excerpt":
        return { ...baseProps, type: "excerpt", payload };
      case "task":
        return { ...baseProps, type: "task", payload };
      default:
        return { ...baseProps, type: "task", payload };
    }
  }
}
