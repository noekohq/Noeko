import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../db";
import {
  IFeature,
  IFeatureForm,
  IUserViewRelation,
} from "../../../shared/types/feature";

export default class Feature {
  private _id: StringRecordId;

  constructor(id: string | RecordId) {
    this._id = new StringRecordId(id);
  }

  get id() {
    return this._id;
  }

  async viewedBy(userId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get database");
      }
      const result = await db.query<[IUserViewRelation]>(
        `RELATE $userId->onboarded_to->$featureId CONTENT { createdAt: $now }`,
        {
          now: new Date(),
          userId: new StringRecordId(userId),
          featureId: this.id,
        },
      );
      if (!result || !result[0]) {
        throw new Error("Couldn't get result");
      }
      const [relation] = result;
      return relation;
    } catch (error) {
      console.error("Couldn't mark feature as viewed by user: ", error);
      return undefined;
    }
  }

  async isViewedBy(userId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get database");
      }
      const results = await db.query<[number]>(
        `count(SELECT VALUE id FROM onboarded_to WHERE in = $userId AND out = $featureId)`,
        {
          userId: new StringRecordId(userId),
          featureId: this.id,
        },
      );
      if (!results) {
        throw new Error("No results for ownership check");
      }
      const hasSeen = results[0] > 0;
      return hasSeen;
    } catch (error) {
      console.error("Couldn't check if feature is viewed by user: ", error);
      return undefined;
    }
  }

  static async allViewedBy(
    userId: string | RecordId,
  ): Promise<string[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get database");
      }
      const results = await db.query<[string[]]>(
        `SELECT VALUE out FROM onboarded_to WHERE in = $userId`,
        {
          userId: new StringRecordId(userId),
        },
      );
      if (!results) {
        throw new Error("No results for ownership check");
      }
      const [list] = results;
      return list;
    } catch (error) {
      console.error("Couldn't get all viewed by user: ", error);
      return undefined;
    }
  }

  public static async create(form: IFeatureForm) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error creating feature");
      }

      const result = await db.create<IFeature, IFeatureForm>(
        new RecordId("feature", form.name),
        {
          name: form.name,
        },
      );

      if (!result) {
        throw new Error("Couldn't create the feature");
      }

      const feat = result;
      return feat;
    } catch (error) {
      console.error("Error creating feature: ", error);
      return undefined;
    }
  }

  static async delete(id: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error deleting feature");
      }

      const result = await db.delete(id);

      if (!result) {
        throw new Error("Couldn't delete the feature");
      }

      return result;
    } catch (error) {
      console.error("Error deleting feature: ", error);
      return undefined;
    }
  }

  public static async update(id: string | RecordId, feature: IFeatureForm) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error updating feature");
      }

      const result = await db.merge(id, feature);

      if (!result) {
        throw new Error("Couldn't update the feature");
      }

      return result;
    } catch (error) {
      console.error("Error updating feature: ", error);
      return undefined;
    }
  }

  public static async get(id: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting feature");
      }

      const result = await db.select(id);

      if (!result) {
        throw new Error("Couldn't get the feature");
      }

      return result;
    } catch (error) {
      console.error("Error getting feature: ", error);
      return undefined;
    }
  }

  static async upsert(form: IFeatureForm) {
    try {
      const db = await getDatabase();
      const result = await db?.upsert<IFeature, IFeatureForm>(
        new RecordId("feature", form.name),
        {
          name: form.name,
        },
      );
      if (!result) {
        console.error("Failed to upsert feature");
        return undefined;
      }
      const feature = result;
      return feature;
    } catch (error) {
      console.error("Error upserting role:", error);
      throw error;
    }
  }
}
