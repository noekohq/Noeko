import { RecordId, StringRecordId } from "surrealdb";
import { IIdea } from "./ideas";
import { getDatabase } from "../db";
import { logger } from "../../services/Logger";

export type IRabbitholeIncludes = IIdea;

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

export default class Rabbithole {
  public static async up() {
    const rabbitholeGetFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::get_rabbithole(
        $rabbitholeId: record,
      ) {
        LET $rabbithole = SELECT
          *,
          ->includes->idea as includes
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

  static async addIdea(
    rabbitholeId: string | RecordId,
    ideaId: string | RecordId,
  ) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not initialized");
      }
      const result = await db?.query(
        "RELATE $rabbitholeId->includes->$ideaId SET createdAt = $now;",
        {
          rabbitholeId: new StringRecordId(rabbitholeId),
          ideaId: new StringRecordId(ideaId),
          now: new Date(),
        },
      );
      if (!result) {
        throw new Error(
          "Something went wrong adding idea to rabbithole: ",
          result,
        );
      }
      const [rabbithole] = result;
      return rabbithole;
    } catch (error) {
      logger.error("Error adding idea to rabbithole: ", [rabbitholeId, ideaId]);
      return undefined;
    }
  }

  static async deleteIdea(
    rabbitholeId: string | RecordId,
    ideaId: string | RecordId,
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
          target: new StringRecordId(ideaId),
        },
      );
      if (!result) {
        throw new Error(
          "Something went wrong deleting idea from rabbithole: ",
          result,
        );
      }
      const [rabbithole] = result;
      return rabbithole;
    } catch (error) {
      logger.error("Error deleting idea from rabbithole: ", [
        rabbitholeId,
        ideaId,
      ]);
      return undefined;
    }
  }
}
