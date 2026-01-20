import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../database/db";
import { IIdea, ISafeIdea } from "../../shared/types/idea";
import { ISource } from "../database/models/source";
import { IPublicTask } from "../database/models/task";
import { IConnectable } from "./Graph";

export default class Insights {
  constructor() {}

  public static async up() {
    const db = await getDatabase();

    if (!db) {
      throw new Error("Couldn't get database in Insights up");
    }

    function getRecentConnectablesFunction() {
      return `
          DEFINE FUNCTION OVERWRITE fn::get_recent_things(
            $userId: record<user>,
            $limitEach: int
          ) {
            LET $ideas = SELECT
                *
              OMIT embeddings
              FROM idea
              WHERE
                <-owns<-(user WHERE id = $userId)
              ORDER BY viewedAt DESC
              LIMIT $limitEach;

            LET $tasks = SELECT
                *
              OMIT embeddings
              FROM task
              WHERE
                <-owns<-(user WHERE id = $userId) AND
                completedAt = NULL
              ORDER BY viewedAt DESC
              LIMIT $limitEach;

            LET $sources = SELECT
                *
              OMIT embeddings
              FROM source
              WHERE
                <-owns<-(user WHERE id = $userId)
              ORDER BY viewedAt DESC
              LIMIT $limitEach;

            RETURN {
              ideas: $ideas,
              tasks: $tasks,
              sources: $sources,
            };
          }
          `;
    }

    await db.query(getRecentConnectablesFunction());
  }

  public static async down() {}

  public static async recent(
    userId: string | RecordId,
    filters?: {
      limit?: number;
    },
  ): Promise<IConnectable[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get database in Insights recent");
      }

      const limit = filters?.limit ?? 10;

      const recent = await db.run<{
        ideas: IIdea[];
        tasks: IPublicTask[];
        sources: ISource[];
      }>("fn::get_recent_things", [new StringRecordId(userId), limit]);

      const [ideas, tasks, sources] = [
        recent.ideas.map((i) => ({
          ...i,
          type: "idea" as const,
        })),
        recent.tasks.map((t) => ({
          ...t,
          type: "task" as const,
        })),
        recent.sources.map((s) => ({
          ...s,
          type: "source" as const,
        })),
      ];

      const merged = [...ideas, ...tasks, ...sources];

      const sorted = merged.sort((a, b) => {
        if (!a.viewedAt && !b.viewedAt) return 0;
        if (!a.viewedAt) return 1;
        if (!b.viewedAt) return -1;

        const dateA = new Date(a.viewedAt);
        const dateB = new Date(b.viewedAt);

        return dateB.getTime() - dateA.getTime();
      });

      const final = sorted.slice(0, limit);

      return final as IConnectable[];
    } catch (error) {
      console.error("Error fetching recent connectables:", error);
      return undefined;
    }
  }
}

export const initInsights = async () => {
  console.info("Initializing Insights service...");
  await Insights.up();
  console.info("Insights service initialized ✅");
};
