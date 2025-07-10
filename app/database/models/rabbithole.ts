import { RecordId, StringRecordId } from "surrealdb";
import { IIdea } from "./ideas";
import { getDatabase } from "../db";
import { logger } from "../../services/Logger";
import { ITag } from "./tag";
import { averageEmbeddings } from "../../utils/math";

export type IRabbitholeIncludes = IIdea | ITag;

export type IRabbithole = {
  id: string | RecordId;
  name: string;
  includes?: IRabbitholeIncludes[];
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
  public static async up() {
    const rabbitholeGetFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::get_rabbithole(
        $rabbitholeId: record,
      ) {
        LET $rabbithole = SELECT
          *,
          ->includes->(?) as includes
        FROM ONLY $rabbitholeId
        FETCH includes;

        RETURN $rabbithole;
      }
      `;
    };

    const db = await getDatabase();
    if (!db) {
      console.error("Error running Rabbithole up method!");
    }
    db?.query(rabbitholeGetFunction());
  }

  public static async down() {}

  constructor() {}

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
    form: Partial<IRabbitholeCreator>,
  ) {
    try {
      const db = await getDatabase();
      const result = await db?.merge<IRabbithole, Partial<IRabbitholeCreator>>(
        new StringRecordId(id),
        {
          ...form,
          updatedAt: new Date(),
        },
      );
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

  static async getAll(userId: string | RecordId) {
    try {
      const db = await getDatabase();
      const result = await db?.query<[IRabbithole[]]>(
        "SELECT * FROM rabbithole WHERE <-owns<-(user WHERE id = $userId)",
        { userId: new StringRecordId(userId) },
      );
      if (!result) {
        throw new Error("Something went wrong getting rabbithole: ", result);
      }
      const [rabbithole] = result;
      return rabbithole;
    } catch (error) {
      logger.error("Error getting user rabbitholes: ", [userId]);
      return undefined;
    }
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
      const result = await db?.query<[IRabbitholeInclusion]>(
        "RELATE $rabbitholeId->includes->$thingId SET createdAt = $now;",
        {
          rabbitholeId: new StringRecordId(rabbitholeId),
          thingId: new StringRecordId(thingId),
          now: new Date(),
        },
      );
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
  ): Promise<IIdea[] | undefined> {
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
      const rEmbeddings = !!rabbithole.includes?.length
        ? averageEmbeddings(
            rabbithole.includes
              ?.map((idea) => idea.embeddings)
              .filter((e) => !!e),
          )
        : Array(768).fill(0);
      console.log("Got average embeddings: ", rEmbeddings.slice(0, 10));
      if (!rEmbeddings || rEmbeddings.length === 0) {
        console.warn(
          `Rabbithole with id ${rabbitholeId.toString()} has no embeddings.`,
        );
        return [];
      }

      const results = await db.run<IIdea[]>(
        "fn::search_similar_to_embeddings",
        [rEmbeddings, userId, options?.limit || 25, options?.threshold || 0.4],
      );

      console.log(
        "Got results: ",
        results
          .slice(0, 5)
          .map((r) => {
            return r.title;
          })
          .join(", "),
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
}
