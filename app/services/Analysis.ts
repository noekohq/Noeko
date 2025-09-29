import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../database/db"; // Assuming getDatabase is exported from Twig/app/database/index.ts
import { logger } from "./Logger";
import { ISafeIdea } from "../database/models/ideas";
import { ITag } from "../database/models/tag";
import { User } from "../database/models/user";

interface CountQueryResult {
  count: number;
}

export interface IHeatmapDataPoint {
  date: string;
  count: number;
}

export interface ITagBreakdown {
  mostUsed: ITag[];
  semanticallyCentral: ITag[];
  total: number;
}

export class AnalysisService {
  private constructor() {}

  public static async up() {
    const userAverageEmbeddingVector = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::user_average_embedding_vector(
        $userId: record<user>
      ) {
        LET $ideasOwned =
          SELECT VALUE
            ->owns->idea as owned
          FROM ONLY $userId
          FETCH owned;
        LET $count = count($ideasOwned);

        IF ($count = 0) THEN
          RETURN [];
        END;

        LET $vectors =
            SELECT VALUE
                embeddings
            FROM $ideasOwned
            WHERE
                embeddings != NONE AND
                embeddings != NULL;

        LET $average = array::fold(
            $vectors,
            array::repeat(0, array::len(array::first($vectors))),
            |$accumulator, $current_vector| vector::add($accumulator, $current_vector)
        );

        RETURN $average;
      }
      `;
    };

    const userSemanticallyCentralIdeas = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::find_user_semantically_central_ideas(
        $userId: record<user>,
        $limit: int
      ) {
        LET $average = fn::user_average_embedding_vector($userId);

        LET $ideas =
          SELECT
            *,
            ->is_source_for->(?) as derivedList,
            vector::similarity::cosine(embeddings, $average) as similarity
          OMIT embeddings
          FROM idea
          WHERE
            <-owns<-(user WHERE id = $userId) AND
            embeddings <|10, 400|> $average AND
            embeddings != NONE
          ORDER BY similarity DESC
          LIMIT $limit;

        RETURN $ideas;
      }
      `;
    };

    const userSemanticallyCentralTags = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::find_user_semantically_central_tags(
        $userId: record<user>,
        $limit: int
      ) {
        LET $average = fn::user_average_embedding_vector($userId);

        LET $tags =
          SELECT
            *,
            vector::similarity::cosine(embeddings, $average) as similarity
          OMIT embeddings
          FROM tag
          WHERE
            <-owns<-(user WHERE id = $userId) AND
            embeddings <|10, 400|> $average AND
            embeddings != NONE
          ORDER BY similarity DESC
          LIMIT $limit;

        RETURN $tags;
      }
      `;
    };

    const userTagBreakdown = () => {
      return `
          DEFINE FUNCTION OVERWRITE fn::get_user_tag_breakdown(
            $userId: record<user>
          ) {
            LET $mostUsedTags = SELECT
                *,
                count(
                    SELECT VALUE ->describes->(?) FROM ONLY $parent.id
                ) as total
                OMIT embeddings
                FROM tag
                WHERE <-owns<-(user WHERE id = $userId)
                ORDER BY total DESC
                LIMIT 10;

            LET $semanticallyCentral = fn::find_user_semantically_central_tags($userId, 10);

            LET $totalTags = count(
              SELECT VALUE id FROM tag WHERE <-owns<-(user WHERE id = $userId)
            );

            RETURN {
              mostUsed: $mostUsedTags,
              semanticallyCentral: $semanticallyCentral,
              total: $totalTags
            };
          }
          `;
    };

    const db = await getDatabase();
    if (!db) {
      console.error("Could not initialize analysis service!");
      return;
    }
    await db.query(userAverageEmbeddingVector());
    await db.query(userSemanticallyCentralIdeas());
    await db.query(userSemanticallyCentralTags());
    await db.query(userTagBreakdown());
  }

  public static async getTotalIdeas(): Promise<number | undefined> {
    const source = "AnalysisService.getTotalIdeas";
    try {
      const db = await getDatabase();
      if (!db) {
        logger.error("Failed to get database instance.", undefined, source);
        return undefined;
      }

      const queryResult = await db.query<[CountQueryResult[]]>(
        "SELECT count() FROM idea GROUP ALL;",
      );

      if (
        queryResult &&
        queryResult.length > 0 &&
        queryResult[0] &&
        queryResult[0].length > 0 &&
        typeof queryResult[0][0].count === "number"
      ) {
        return queryResult[0][0].count;
      } else {
        logger.warn(
          "Unexpected result structure or empty table for total ideas query.",
          { queryResult },
          source,
        );
        return undefined;
      }
    } catch (error: any) {
      logger.error(
        "Error fetching total number of ideas.",
        { error: error.message, stack: error.stack },
        source,
      );
      return undefined;
    }
  }

  public static async getTotalUsers(): Promise<number | undefined> {
    const source = "AnalysisService.getTotalUsers";
    try {
      const db = await getDatabase();
      if (!db) {
        logger.error("Failed to get database instance.", undefined, source);
        return undefined;
      }

      const queryResult = await db.query<[CountQueryResult[]]>(
        "SELECT count() FROM user GROUP ALL;",
      );

      if (
        queryResult &&
        queryResult.length > 0 &&
        queryResult[0] &&
        queryResult[0].length > 0 &&
        typeof queryResult[0][0].count === "number"
      ) {
        return queryResult[0][0].count;
      } else {
        logger.warn(
          "Unexpected result structure or empty table for total users query.",
          { queryResult },
          source,
        );
        return undefined;
      }
    } catch (error: any) {
      logger.error(
        "Error fetching total number of users.",
        { error: error.message, stack: error.stack },
        source,
      );
      return undefined;
    }
  }

  public static async getUserHeatmap(
    userId: string | RecordId,
    options?: {
      yearStart: string;
      yearEnd: string;
    },
  ): Promise<IHeatmapDataPoint[] | undefined> {
    const source = "AnalysisService.getTotalUsers";
    try {
      const db = await getDatabase();
      if (!db) {
        logger.error("Failed to get database instance.", undefined, source);
        return undefined;
      }

      const currentYear = new Date().getFullYear();

      const startOfYearStr =
        options?.yearStart ?? `${currentYear}-01-01T00:00:00Z`;
      const endOfYearStr =
        options?.yearEnd ?? `${currentYear + 1}-01-01T00:00:00Z`;

      const queryResult = await db.query<[IHeatmapDataPoint[]]>(
        `
        SELECT
            time::format(day, '%Y-%m-%d') as date,
            count
        FROM (
            SELECT
                time::floor(createdAt, 1d) AS day,
                count() as count
            FROM idea
            WHERE
                <-owns<-(user WHERE id = <record> $userId) AND
                createdAt >= d'${startOfYearStr}' AND
                createdAt <= d'${endOfYearStr}'
            GROUP BY day
        );
        `,
        {
          userId: new StringRecordId(userId),
        },
      );

      if (!queryResult || !queryResult.length) {
        logger.error(
          "Unexpected result structure or empty table for user heatmap query.",
          { queryResult },
          source,
        );
        return undefined;
      }

      const [heatmapData] = queryResult;
      return heatmapData;
    } catch (error: any) {
      logger.error(
        "Error fetching user heatmap.",
        { error: error.message, stack: error.stack, userId },
        source,
      );
      return undefined;
    }
  }

  public static async getUserCentralIdeas(
    userId: string | RecordId,
    limit: number = 10,
  ): Promise<ISafeIdea[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database connection not established");
      }
      const query = `
        SELECT
          *,
          count(<-connected) AS incoming,
          count(->connected) AS outgoing,
          count(<-connected) + count(->connected) as total
        FROM idea
        WHERE <-owns<-(user WHERE id = <record>$userId)
        ORDER BY total DESC
        LIMIT $limit;
        `;
      const results = await db.query<[ISafeIdea[]]>(query, {
        userId: new StringRecordId(userId),
        limit,
      });
      if (!results || !results[0]) {
        throw new Error("Could not get results");
      }
      const [ideas] = results;
      return ideas;
    } catch (error) {
      console.error("Error getting central idea: ", error);
      return undefined;
    }
  }

  public static async getUserSemanticCentralIdeas(
    userId: string | RecordId,
  ): Promise<ISafeIdea[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database connection not established");
      }
      const [numIdeas] = await db.query<[number]>(
        `count(SELECT id FROM ideas WHERE <-owns<-(user WHERE id = $userId));`,
        {
          userId: new StringRecordId(userId),
        },
      );
      if (!numIdeas) {
        return;
      }
      const results = await db.run<ISafeIdea[]>(
        "fn::find_user_semantically_central_ideas",
        [new StringRecordId(userId), 10],
      );
      if (!results) {
        throw new Error("Could not get results");
      }
      return results;
    } catch (error) {
      console.error("Error getting semantic central idea: ", error);
      return undefined;
    }
  }

  public static async getUserTagBreakdown(
    userId: string | RecordId,
  ): Promise<ITagBreakdown | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database connection not established");
      }
      const [numTags] = await db.query<[number]>(
        `count(SELECT id FROM tags WHERE <-owns<-(user WHERE id = $userId));`,
        {
          userId: new StringRecordId(userId),
        },
      );
      if (!numTags) {
        return;
      }
      const results = await db.run<ITagBreakdown>(
        "fn::get_user_tag_breakdown",
        [new StringRecordId(userId)],
      );
      if (!results) {
        throw new Error("Could not get results");
      }
      return results;
    } catch (error) {
      console.error("Error getting tag breakdown: ", error);
      return undefined;
    }
  }
}

export async function initAnalysis() {
  await AnalysisService.up();
}
