import { RecordId, StringRecordId } from "surrealdb";
import { ISafeIdea } from "../../../shared/types/idea";
import { getDatabase } from "../db";
import { logger } from "../../services/Logger";
import { ITag } from "../../../shared/types/tags";
import { averageEmbeddings } from "../../utils/math";
import { getEmbedder } from "../../ai/embeddings/embeddings";
import { getLM } from "../../ai/lms/lm";
import { LMSchemaType } from "../../ai/lms";
import GraphService, { IConnectable } from "../../services/Graph";
import {
  IRabbithole,
  IRabbitholeCreator,
  IRabbitholeForm,
  IRabbitholeIncludes,
  IRabbitholeInclusion,
  IRabbitholeInclusionOrigin,
  IRabbitholeRecommendationPolicy,
} from "../../../shared/types/rabbithole";
import { GLOBAL_SEMANTIC_SEARCH_THRESHOLD } from "../../../shared/constants/semantic";

// Re-export types for backward compatibility
export type {
  IRabbithole,
  IRabbitholeCreator,
  IRabbitholeForm,
  IRabbitholeIncludes,
  IRabbitholeInclusion,
};

export const DEFAULT_RABBITHOLE_RECOMMENDATION_POLICY: IRabbitholeRecommendationPolicy = {
  mode: "suggest",
  threshold: GLOBAL_SEMANTIC_SEARCH_THRESHOLD,
  types: ["idea", "task", "source", "excerpt"],
};

export default class Rabbithole {
  _id: string | RecordId;
  constructor(id: string | RecordId) {
    this._id = id;
  }

  public get id() {
    return this._id;
  }

  public async get() {
    return await Rabbithole.get(this._id);
  }

  public async getConnectables() {
    return await Rabbithole.getThings(this._id);
  }

  private static getThingTitle(thing: IConnectable) {
    switch (thing.type) {
      case "idea":
        return thing.title;
      case "task":
        return thing.description;
      case "source":
        return thing.displayName;
      case "excerpt":
        return thing.note || thing.sourceText;
    }
  }

  private static plainText(value?: string | null) {
    return (value ?? "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private static getThingBody(thing: IConnectable) {
    switch (thing.type) {
      case "idea":
        return thing.contentPlain || thing.content;
      case "task":
        return thing.scratchpad;
      case "source":
        return thing.content;
      case "excerpt":
        return [thing.note, thing.sourceText].filter(Boolean).join("\n");
    }
  }

  public static async getGenerativeContext(rabbitholeId: string | RecordId) {
    const things = (await this.getThings(rabbitholeId)) ?? [];
    if (!things.length) return null;

    return things
      .map((thing) => {
        const title = this.plainText(this.getThingTitle(thing));
        const body = this.plainText(this.getThingBody(thing)).slice(0, 4_000);
        return [`## ${thing.type}${title ? `: ${title}` : ""}`, body].filter(Boolean).join("\n");
      })
      .join("\n\n")
      .slice(0, 24_000);
  }

  public static async giveGenerativeName(rabbitholeId: string | RecordId) {
    const context = await this.getGenerativeContext(rabbitholeId);
    if (!context) return undefined;
    const name = await getLM().utils.entitle(
      context,
      "Name this topical workspace in 2-7 specific, scannable words. Capture the shared subject or investigation across its contents. Return only the name."
    );
    if (!name?.trim()) return undefined;
    const updated = await this.update(rabbitholeId, {
      name: name.trim(),
      nameGeneratedAt: new Date(),
    });
    if (updated) await this.cacheCentroidVector(rabbitholeId);
    return updated;
  }

  public static async giveGenerativeDescription(rabbitholeId: string | RecordId) {
    const context = await this.getGenerativeContext(rabbitholeId);
    if (!context) return undefined;
    const result = await getLM().generateJSON<{ text: string }>(
      `Write a concise one- or two-sentence description of the topical workspace represented by the content below. Explain what it is exploring or trying to accomplish. Be specific, natural, and useful for future semantic matching. Do not mention that you were given items or content.\n\n${context}`,
      {
        type: LMSchemaType.OBJECT,
        properties: {
          text: {
            type: LMSchemaType.STRING,
            description: "The Rabbithole workspace description.",
          },
        },
        required: ["text"],
      }
    );
    if (!result?.text?.trim()) return undefined;
    const updated = await this.update(rabbitholeId, {
      description: result.text.trim(),
      descriptionGeneratedAt: new Date(),
    });
    if (updated) await this.cacheCentroidVector(rabbitholeId);
    return updated;
  }

  public static buildContentSummary(things: IConnectable[]) {
    if (!things.length) return "This workspace is ready for its first thought, source, or task.";

    const titles = things
      .map((thing) =>
        this.getThingTitle(thing)
          ?.replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 80)
      )
      .filter((title): title is string => Boolean(title))
      .slice(0, 3);
    const counts = things.reduce<Record<string, number>>((result, thing) => {
      result[thing.type] = (result[thing.type] ?? 0) + 1;
      return result;
    }, {});
    const scope = Object.entries(counts)
      .map(([type, count]) => `${count} ${type}${count === 1 ? "" : "s"}`)
      .join(", ");

    if (!titles.length) return `This workspace currently connects ${scope}.`;
    const focus = titles.map((title) => `“${title}”`).join(titles.length > 1 ? ", " : "");
    const remainder = things.length - titles.length;
    return `Currently exploring ${focus}${remainder > 0 ? `, and ${remainder} more` : ""} across ${scope}.`;
  }

  public static async refreshContentSummary(rabbitholeId: string | RecordId) {
    const things = (await this.getThings(rabbitholeId)) ?? [];
    const contentSummary = this.buildContentSummary(things);
    await this.update(rabbitholeId, { contentSummary });
    return contentSummary;
  }

  public static async up() {
    const rabbitholeGetFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::get_rabbithole(
        $rabbitholeId: record,
      ) {
        LET $rabbithole = SELECT
          *,
          (
              SELECT
                  *
              OMIT embeddings
              FROM $parent->includes
              ORDER BY createdAt DESC
              FETCH out
          ).out as includes
        FROM ONLY $rabbitholeId;

        RETURN $rabbithole;
      }
      `;
    };

    const searchSimilarToRabbitholeFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::search_ideas_similar_to_rabbithole(
        $rabbithole: record<rabbithole>,
        $user: record<user>
      ) {
        LET $average = IF $rabbithole.cachedCentroidEmbeddings != NONE AND array::len($rabbithole.cachedCentroidEmbeddings) > 0 THEN
            $rabbithole.cachedCentroidEmbeddings
        ELSE
            (
                SELECT VALUE array::fold(
                    vectors,
                    array::repeat(0, array::len(array::first(vectors))),
                    |$accumulator, $current_vector| vector::add($accumulator, $current_vector)
                )
                FROM (
                    SELECT (SELECT VALUE embeddings FROM $rabbithole->includes WHERE embeddings != NONE) AS vectors FROM ONLY $rabbithole
                )
            )[0]
        END;

        IF $average = NONE OR $average = NULL OR count($average) = 0 THEN
            RETURN [];
        END;

        LET $includes = SELECT VALUE id FROM $rabbithole->includes;

        LET $ideas =
          SELECT
            *,
            ->is_source_for->(?) as derivedList,
            vector::similarity::cosine(embeddings, $average) as similarity
          OMIT embeddings
          FROM idea
          WHERE
            <-owns<-(user WHERE id = $user) AND
            id NOT IN $includes AND
            embeddings <|10, 400|> $average AND
            embeddings != NONE
          ORDER BY similarity DESC;

        RETURN $ideas;
      }
      `;
    };

    const db = await getDatabase();
    if (!db) {
      console.error("Error running Rabbithole up method!");
    }
    await db?.query(rabbitholeGetFunction());
    await db?.query(searchSimilarToRabbitholeFunction());
  }

  public static async down() {}

  static async create(userId: string | RecordId, form: IRabbitholeForm) {
    try {
      const db = await getDatabase();
      const result = await db?.create<IRabbithole, IRabbitholeCreator>("rabbithole", {
        ...form,
        description: form.description ?? "",
        recommendationPolicy: form.recommendationPolicy ?? DEFAULT_RABBITHOLE_RECOMMENDATION_POLICY,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      if (!result) {
        throw new Error("Something went wrong creating rabbithole: ", result);
      }
      const [rabbithole] = result;
      await db?.query("RELATE $userId->owns->$rabbitholeId CONTENT { createdAt: $now, }", {
        userId: new StringRecordId(userId),
        rabbitholeId: new StringRecordId(rabbithole.id),
        now: new Date(),
      });
      return rabbithole;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }

  static async update(
    id: string | RecordId,
    form: Partial<IRabbitholeCreator & { cachedCentroidEmbeddings: number[] }>
  ) {
    try {
      const db = await getDatabase();
      const result = await db?.merge<
        IRabbithole,
        Partial<IRabbitholeCreator & { cachedCentroidEmbeddings: number[] }>
      >(new StringRecordId(id), {
        ...form,
        updatedAt: new Date(),
      });
      if (!result) {
        throw new Error("Something went wrong updating rabbithole: ", result);
      }
      const rabbithole = result;
      return rabbithole;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }

  static async get(id: string | RecordId) {
    try {
      const db = await getDatabase();
      const result = await db?.run<IRabbithole>(`fn::get_rabbithole`, [new StringRecordId(id)]);
      if (!result) {
        throw new Error("Something went wrong getting rabbithole: ", result);
      }
      const includes = result.includes?.map(
        (thing) =>
          ({
            ...thing,
            type: GraphService.getTable(thing.id),
          }) as IRabbitholeIncludes
      );
      return {
        ...result,
        includes,
        contentSummary: Rabbithole.buildContentSummary(
          (includes ?? []).filter((thing): thing is IConnectable => thing.type !== "tag")
        ),
      };
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }

  static async getAll(userId: string | RecordId, options?: { limit: number }) {
    try {
      const db = await getDatabase();
      const limit = options?.limit ? Number(options.limit) : undefined;
      const result = await db?.query<[IRabbithole[]]>(
        `SELECT * FROM rabbithole WHERE <-owns<-(user WHERE id = $userId) ORDER BY updatedAt DESC${limit ? " LIMIT $limit;" : ""};`,
        { userId: new StringRecordId(userId), limit }
      );
      if (!result) {
        throw new Error("Something went wrong getting rabbithole: ", result);
      }
      const [rabbithole] = result;
      return rabbithole;
    } catch (error) {
      logger.error("Error getting user rabbitholes: ", [userId, error]);
      return undefined;
    }
  }

  static async delete(rabbitholeId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not initialized");
      }
      const result = await db?.delete<IRabbithole>(new StringRecordId(rabbitholeId));
      if (!result) {
        throw new Error("Something went wrong deleting rabbithole: ", result);
      }
      const rabbithole = result;
      return rabbithole;
    } catch (error) {
      logger.error("Error deleting rabbithole: ", [error]);
      return undefined;
    }
  }

  static async getRabbitholeAverageEmbeddings(rabbitholeId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Database not initialized");

      const results = await db.query<[(IRabbitholeIncludes & { embeddings: number[] })[]]>(
        `
        SELECT VALUE
          ->includes->(?) as includes
        FROM ONLY $rabbitholeId
        FETCH includes;
        `,
        {
          rabbitholeId: new StringRecordId(rabbitholeId),
        }
      );

      if (!results) {
        throw new Error("Couldn't get results");
      }

      const [included] = results;
      const vectors = included.map((i) => i.embeddings).filter((i) => !!i);

      const averageEmbedding = averageEmbeddings(vectors);

      return averageEmbedding;
    } catch (error) {
      console.error("Error getting average embeddings: ", error);
      return undefined;
    }
  }

  static async cacheCentroidVector(rabbitholeId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Database not initialized");

      const rabbithole = await this.get(rabbitholeId);
      if (!rabbithole) throw new Error("Rabbithole not found");
      const includedAverage = await this.getRabbitholeAverageEmbeddings(rabbitholeId);
      const context = [rabbithole.name, rabbithole.description].filter(Boolean).join(". ").trim();
      const contextEmbedding = context ? await getEmbedder().embedContent(context) : null;
      const vectors = [contextEmbedding, includedAverage].filter((vector): vector is number[] =>
        Boolean(vector?.length)
      );
      const average = averageEmbeddings(vectors);

      await Rabbithole.update(rabbitholeId, {
        cachedCentroidEmbeddings: average,
      });

      return average;
    } catch (error) {
      console.error("Error caching the rabbithole centroid vector: ", error);
      return undefined;
    }
  }

  static async isIncludable(thing: string | RecordId) {
    const thingId = thing.toString();
    if (GraphService.isConnectable(thing) || thingId.startsWith("tag")) {
      return true;
    }
    return false;
  }

  static async addThing(
    rabbitholeId: string | RecordId,
    thingId: string | RecordId,
    options: {
      origin?: IRabbitholeInclusionOrigin;
      similarity?: number;
      reason?: string;
    } = {}
  ) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not initialized");
      }
      const isIncludable = await this.isIncludable(thingId);
      if (!isIncludable) {
        throw new Error("Thing is not includable");
      }
      const [existing] = await db.query<[IRabbitholeInclusion[]]>(
        "SELECT * FROM includes WHERE in = $rabbitholeId AND out = $thingId LIMIT 1;",
        {
          rabbitholeId: new StringRecordId(rabbitholeId),
          thingId: new StringRecordId(thingId),
        }
      );
      if (existing?.[0]) {
        return existing[0];
      }
      await db.query(
        `DELETE rabbithole_excludes WHERE in = $rabbitholeId AND out = $thingId;
         DELETE rabbithole_recommends WHERE in = $rabbitholeId AND out = $thingId;`,
        {
          rabbitholeId: new StringRecordId(rabbitholeId),
          thingId: new StringRecordId(thingId),
        }
      );
      const result = await db.query<[IRabbitholeInclusion[]]>(
        `RELATE $rabbitholeId->includes->$thingId CONTENT {
          createdAt: $now,
          origin: $origin,
          similarity: $similarity,
          reason: $reason
        };`,
        {
          rabbitholeId: new StringRecordId(rabbitholeId),
          thingId: new StringRecordId(thingId),
          now: new Date(),
          origin: options.origin ?? "manual",
          similarity: options.similarity,
          reason: options.reason,
        }
      );
      if (!result) {
        throw new Error("Something went wrong adding thing to rabbithole: ", result);
      }
      await this.update(rabbitholeId, { updatedAt: new Date() });
      await this.cacheCentroidVector(rabbitholeId);
      await this.refreshContentSummary(rabbitholeId);
      return result[0]?.[0];
    } catch (error) {
      logger.error("Error adding thing to rabbithole: ", [rabbitholeId, thingId]);
      return undefined;
    }
  }

  static async addThings(rabbitholeId: string | RecordId, thingIds: string[] | RecordId[]) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not initialized");
      }
      const invalid = (
        await Promise.all(thingIds.map(async (id) => ((await this.isIncludable(id)) ? null : id)))
      ).filter(Boolean);
      if (invalid.length) {
        throw new Error(`Some things are not includable: ${invalid.join(", ")}`);
      }
      const results = await Promise.all(
        thingIds.map((thingId) => this.addThing(rabbitholeId, thingId, { origin: "manual" }))
      );
      return results.filter(Boolean);
    } catch (error) {
      logger.error("Error adding things to rabbithole: ", [rabbitholeId, thingIds]);
      return undefined;
    }
  }

  static async getThings(rabbitholeId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not initialized");
      }
      const result = await db?.query<[IConnectable[]]>(
        `
          SELECT VALUE
              (SELECT * OMIT embeddings
              FROM $parent->includes->(?))
          FROM ONLY $rabbitholeId;
          `,
        {
          rabbitholeId: new StringRecordId(rabbitholeId),
        }
      );
      if (!result) {
        throw new Error("Something went wrong getting things from rabbithole: ", result);
      }
      const [rabbithole] = result;
      return rabbithole.map(
        (thing) =>
          ({
            ...thing,
            type: GraphService.getTable(thing.id),
          }) as IConnectable
      );
    } catch (error) {
      logger.error("Error getting things from rabbithole: ", [rabbitholeId]);
      return undefined;
    }
  }

  static async removeThing(rabbitholeId: string | RecordId, thingId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not initialized");
      }
      const result = await db?.query(
        "DELETE FROM (SELECT VALUE <->includes FROM ONLY <record> $source) WHERE out = <record> $target OR in = <record> $target;",
        {
          source: new StringRecordId(rabbitholeId),
          target: new StringRecordId(thingId),
        }
      );
      if (!result) {
        throw new Error("Something went wrong deleting thing from rabbithole: ", result);
      }
      await db.query(
        `RELATE $rabbitholeId->rabbithole_excludes->$thingId CONTENT {
          createdAt: $now,
          reason: "removed"
        };`,
        {
          rabbitholeId: new StringRecordId(rabbitholeId),
          thingId: new StringRecordId(thingId),
          now: new Date(),
        }
      );
      await this.update(rabbitholeId, { updatedAt: new Date() });
      await this.cacheCentroidVector(rabbitholeId);
      await this.refreshContentSummary(rabbitholeId);
      const [rabbithole] = result;
      return rabbithole;
    } catch (error) {
      logger.error("Error deleting thing from rabbithole: ", [rabbitholeId, thingId]);
      return undefined;
    }
  }

  static async findSimilarIdeas(
    rabbitholeId: string | RecordId,
    userId: string | RecordId,
    options?: {
      limit?: number;
      threshold?: number;
    }
  ): Promise<ISafeIdea[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }
      const rabbithole = await Rabbithole.get(rabbitholeId);
      if (!rabbithole) {
        throw new Error(`Rabbithole with id ${rabbitholeId.toString()} not found.`);
      }
      const results = await db.run<ISafeIdea[]>("fn::search_ideas_similar_to_rabbithole", [
        new StringRecordId(rabbitholeId),
        new StringRecordId(userId),
      ]);

      if (!results) {
        console.warn(
          `No similar ideas found for rabbithole ${rabbitholeId.toString()} for user ${userId.toString()}.`
        );
        return [];
      }
      return results;
    } catch (error) {
      console.error(
        `Error getting similar ideas for rabbithole ${rabbitholeId.toString()}: `,
        error
      );
      return undefined;
    }
  }

  static async getSimilarThings(
    userId: string | RecordId,
    rabbitholeId: string | RecordId,
    options: {
      limit?: number;
      threshold?: number;
      candidates?: number;
    }
  ): Promise<IRabbitholeIncludes[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Database not initialized");

      const limit = options.limit || 25;
      const threshold = Number(options.threshold) || 0.45;

      const rabbithole = await Rabbithole.get(rabbitholeId);

      if (!rabbithole) {
        throw new Error("No rabbithole found");
      }

      let centroidEmbeddings: number[] | undefined = rabbithole.cachedCentroidEmbeddings;
      if (!centroidEmbeddings) {
        const centroid = await Rabbithole.cacheCentroidVector(rabbitholeId);
        centroidEmbeddings = centroid ?? undefined;
      }

      if (!centroidEmbeddings) {
        throw new Error("Couldn't get centroid embeddings");
      }

      const similarThings = await GraphService.searchSimilarConnectables(
        userId,
        centroidEmbeddings,
        {
          limit,
          threshold,
        }
      );

      if (!similarThings) {
        throw new Error("Couldn't get similar things");
      }

      return similarThings;
    } catch (error) {
      console.error("Error finding rabbithole suggestions:", error);
      return undefined;
    }
  }
}
