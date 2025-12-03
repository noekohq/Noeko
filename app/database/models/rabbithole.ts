import { RecordId, StringRecordId } from "surrealdb";
import { IIdea, ISafeIdea } from "./ideas";
import { getDatabase } from "../db";
import { logger } from "../../services/Logger";
import { ITag } from "./tag";
import { averageEmbeddings } from "../../utils/math";
import { Search } from "../../services/Search";
import { ITask } from "./task";
import { IUserFile } from "./userfile";
import { ISource } from "./source";
import GraphService, { IConnectable } from "../../services/Graph";

export type IRabbitholeIncludes = IConnectable | (ITag & { type: "tag" });

export type IRabbithole = {
  id: string | RecordId;
  name: string;
  includes?: IRabbitholeIncludes[];
  cachedCentroidEmbeddings?: number[];
  createdAt: Date;
  updatedAt: Date;
};

export type IRabbitholeCreator = Omit<IRabbithole, "id" | "includes">;

export type IRabbitholeForm = Omit<
  IRabbitholeCreator,
  "createdAt" | "updatedAt"
>;

export type IRabbitholeInclusion = {
  id: string | RecordId;
  in: string | RecordId;
  out: string | RecordId;
  createdAt: Date;
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
      const result = await db?.create<IRabbithole, IRabbitholeCreator>(
        "rabbithole",
        {
          ...form,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      );
      if (!result) {
        throw new Error("Something went wrong creating rabbithole: ", result);
      }
      const [rabbithole] = result;
      await db?.query(
        "RELATE $userId->owns->$rabbitholeId CONTENT { createdAt: $now, }",
        {
          userId: new StringRecordId(userId),
          rabbitholeId: new StringRecordId(rabbithole.id),
          now: new Date(),
        },
      );
      return rabbithole;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }

  static async update(
    id: string | RecordId,
    form: Partial<IRabbitholeCreator & { cachedCentroidEmbeddings: number[] }>,
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
      const result = await db?.run<IRabbithole>(`fn::get_rabbithole`, [
        new StringRecordId(id),
      ]);
      if (!result) {
        throw new Error("Something went wrong getting rabbithole: ", result);
      }
      const rabbithole = result;
      return rabbithole;
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
        `SELECT * FROM rabbithole WHERE <-owns<-(user WHERE id = $userId) ORDER BY updatedAt${limit ? " LIMIT $limit;" : ""};`,
        { userId: new StringRecordId(userId), limit },
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
      const result = await db?.delete<IRabbithole>(
        new StringRecordId(rabbitholeId),
      );
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

      const results = await db.query<
        [(IRabbitholeIncludes & { embeddings: number[] })[]]
      >(
        `
        SELECT VALUE
          ->includes->(?) as includes
        FROM ONLY $rabbitholeId
        FETCH includes;
        `,
        {
          rabbitholeId: new StringRecordId(rabbitholeId),
        },
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

      const averageEmbeddings =
        await this.getRabbitholeAverageEmbeddings(rabbitholeId);

      await Rabbithole.update(rabbitholeId, {
        cachedCentroidEmbeddings: averageEmbeddings,
      });

      return averageEmbeddings;
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
      const result = await db?.query<[IRabbitholeInclusion]>(
        "RELATE $rabbitholeId->includes->$thingId SET createdAt = $now;",
        {
          rabbitholeId: new StringRecordId(rabbitholeId),
          thingId: new StringRecordId(thingId),
          now: new Date(),
        },
      );
      this.update(rabbitholeId, { updatedAt: new Date() });
      this.cacheCentroidVector(rabbitholeId);
      if (!result) {
        throw new Error(
          "Something went wrong adding thing to rabbithole: ",
          result,
        );
      }
      const [rabbithole] = result;
      return rabbithole;
    } catch (error) {
      logger.error("Error adding thing to rabbithole: ", [
        rabbitholeId,
        thingId,
      ]);
      return undefined;
    }
  }

  static async addThings(
    rabbitholeId: string | RecordId,
    thingIds: string[] | RecordId[],
  ) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not initialized");
      }
      const result = await db?.query(
        "RELATE $rabbitholeId->includes->$thingIds SET createdAt = $now;",
        {
          rabbitholeId: new StringRecordId(rabbitholeId),
          thingIds: thingIds.map((id) => new StringRecordId(id)),
          now: new Date(),
        },
      );
      this.update(rabbitholeId, { updatedAt: new Date() });
      this.cacheCentroidVector(rabbitholeId);
      if (!result) {
        throw new Error(
          "Something went wrong adding things to rabbithole: ",
          result,
        );
      }
      const [rabbithole] = result;
      return rabbithole;
    } catch (error) {
      logger.error("Error adding things to rabbithole: ", [
        rabbitholeId,
        thingIds,
      ]);
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
        },
      );
      if (!result) {
        throw new Error(
          "Something went wrong getting things from rabbithole: ",
          result,
        );
      }
      const [rabbithole] = result;
      return rabbithole;
    } catch (error) {
      logger.error("Error getting things from rabbithole: ", [rabbitholeId]);
      return undefined;
    }
  }

  static async removeThing(
    rabbitholeId: string | RecordId,
    thingId: string | RecordId,
  ) {
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
        },
      );
      this.update(rabbitholeId, { updatedAt: new Date() });
      this.cacheCentroidVector(rabbitholeId);
      if (!result) {
        throw new Error(
          "Something went wrong deleting thing from rabbithole: ",
          result,
        );
      }
      const [rabbithole] = result;
      return rabbithole;
    } catch (error) {
      logger.error("Error deleting thing from rabbithole: ", [
        rabbitholeId,
        thingId,
      ]);
      return undefined;
    }
  }

  static async findSimilarIdeas(
    rabbitholeId: string | RecordId,
    userId: string | RecordId,
    options?: {
      limit?: number;
      threshold?: number;
    },
  ): Promise<ISafeIdea[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }
      const rabbithole = await Rabbithole.get(rabbitholeId);
      if (!rabbithole) {
        throw new Error(
          `Rabbithole with id ${rabbitholeId.toString()} not found.`,
        );
      }
      const results = await db.run<ISafeIdea[]>(
        "fn::search_ideas_similar_to_rabbithole",
        [new StringRecordId(rabbitholeId), new StringRecordId(userId)],
      );

      if (!results) {
        console.warn(
          `No similar ideas found for rabbithole ${rabbitholeId.toString()} for user ${userId.toString()}.`,
        );
        return [];
      }
      return results;
    } catch (error) {
      console.error(
        `Error getting similar ideas for rabbithole ${rabbitholeId.toString()}: `,
        error,
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
    },
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

      let centroidEmbeddings: number[] | undefined =
        rabbithole.cachedCentroidEmbeddings;
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
        },
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
