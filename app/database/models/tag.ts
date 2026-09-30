import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../db";
import { User } from "./user";
import { Idea } from "./ideas"; // Assuming Idea model is in this path
import { IIdea, IIdeaDerived } from "../../../shared/types/idea";
import {
  ITag,
  ITagDescribes,
  ITagDescriptionRelationship,
  ITagForm,
  ITagUserOwnership,
} from "../../../shared/types/tags";
import { getEmbedder } from "../../ai/embeddings/embeddings";
import { buildReadyEmbeddingUpdate, isEmbeddingCurrent } from "../../ai/embeddings/lifecycle";
import { Search } from "../../services/Search";
import GraphService, { IConnectable } from "../../services/Graph";
import { averageEmbeddings, blendVectors, weightedAverage } from "../../utils/math";
import type { IEmbeddingMetadata } from "../../../shared/types/embeddings";

// Re-export types for backward compatibility
export type { ITag, ITagDescribes, ITagDescriptionRelationship, ITagForm, ITagUserOwnership };

export class Tag {
  _id: StringRecordId;

  constructor(id: string | RecordId) {
    this._id = new StringRecordId(id);
  }

  public get id() {
    return this._id;
  }

  public async get(): Promise<ITag | undefined> {
    return await Tag.get(this.id.toString());
  }

  public async getConnectables(): Promise<IConnectable[] | undefined> {
    return await Tag.getTagThings(this.id.toString());
  }

  public static SUGGESTION_WEIGHT = 0.6; // 0-1, higher numbers favor the centroid, lower favors the description

  static async up() {
    const db = await getDatabase();
    if (!db) {
      throw new Error("Something went wrong getting the database");
    }

    const getTagFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::get_tag(
        $tag: record
      ) {
        RETURN SELECT
          *,
          ->describes->(?) as describes
        FROM ONLY $tag
        FETCH describes;
      }
      `;
    };

    const getUserTagsFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::get_user_tags(
        $userId: record<user>,
      ) {
        RETURN SELECT VALUE ->owns->tag FROM ONLY $userId FETCH tag;
      }`;
    };

    const getIdeasForTagFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::get_ideas_for_tag(
        $tagId: record<tag>,
      ) {
        RETURN SELECT VALUE ->describes->idea FROM ONLY $tagId FETCH idea;
      }`;
    };

    const getTagsForIdeaFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::get_tags_for_idea(
        $ideaId: record<idea>,
      ) {
        RETURN SELECT VALUE <-describes<-tag FROM ONLY $ideaId FETCH tag;
      }
      `;
    };

    const searchSimilarToTagFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::search_ideas_similar_to_tag(
        $tag: record<tag>,
        $user: record<user>
      ) {
        LET $tag_embeddings = SELECT VALUE embeddings FROM ONLY $tag;

        LET $ideas =
          SELECT
            *,
            ->is_source_for->(?) as derivedList,
            vector::similarity::cosine(embeddings, $tag_embeddings) as similarity
          FROM idea
          WHERE
            <-owns<-(user WHERE id = $user) AND
            embeddings <|10, 400|> $tag_embeddings AND
            embeddings != NONE
          ORDER BY similarity DESC;

        RETURN $ideas;
      }
      `;
    };

    await db.query(getTagFunction());
    await db.query(getUserTagsFunction());
    await db.query(getIdeasForTagFunction());
    await db.query(getTagsForIdeaFunction());
    await db.query(searchSimilarToTagFunction());
  }

  static async create(data: ITagForm, userId: string | RecordId): Promise<ITag | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database to create tag");
      }

      const user = await User.get(userId);
      if (!user) {
        throw new Error("Tried to create tag for a user that does not exist");
      }

      const result = await db.create<ITag, ITagForm & { createdAt: Date; updatedAt: Date }>("tag", {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (!result || result.length === 0) {
        throw new Error("Result from tag creation is falsey or empty");
      }

      const [tagRecord] = result;

      // Create ownership relationship
      await db.query(`RELATE $userId ->owns-> $tagId SET createdAt = $now;`, {
        userId: new StringRecordId(userId),
        tagId: tagRecord.id,
        now: new Date(),
      });

      await Tag.updateEmbeddings(tagRecord);

      return tagRecord;
    } catch (error) {
      console.error("Error creating tag: ", error);
      return undefined;
    }
  }
  static async get(id: string | RecordId): Promise<ITag | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }
      const result = await db.run<ITag>("fn::get_tag", [new StringRecordId(id)]);
      if (!result) {
        console.warn("Could not find tag with id: " + id.toString());
        return undefined;
      }
      return result;
    } catch (error) {
      console.error("Error getting tag: ", error);
      return undefined;
    }
  }

  static async getUserTags(userId: string | RecordId): Promise<ITag[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }
      const result = await db.run<ITag[]>("fn::get_user_tags", [new StringRecordId(userId)]);
      if (!result) {
        console.warn("Error getting user tags or user has no tags");
        return undefined;
      }
      return result;
    } catch (error) {
      console.error("Error getting user tags: ", error);
      return undefined;
    }
  }

  static async getAll(userId: string | RecordId, options?: { limit: number }) {
    try {
      const db = await getDatabase();
      const limit = options?.limit ? Number(options.limit) : undefined;
      const result = await db?.query<[ITag[]]>(
        `SELECT * FROM tag WHERE <-owns<-(user WHERE id = $userId) ORDER BY updatedAt${limit ? " LIMIT $limit;" : ""};`,
        { userId: new StringRecordId(userId), limit }
      );
      if (!result) {
        throw new Error("Something went wrong getting tag: ", result);
      }
      const [tag] = result;
      return tag;
    } catch (error) {
      console.error("Error getting user tags: ", [userId, error]);
      return undefined;
    }
  }

  static async update(
    id: string | RecordId,
    data: Partial<
      ITagForm & {
        embeddings: number[];
        embeddingsUpdatedAt: Date;
        cachedCentroidEmbeddings: number[];
      } & IEmbeddingMetadata
    >
  ): Promise<ITag | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }
      const result = await db.merge<ITag, Partial<ITagForm> & { updatedAt: Date }>(
        new StringRecordId(id),
        {
          ...data,
          updatedAt: new Date(),
        }
      );
      if (!result) {
        throw new Error("Result from tag update is falsey");
      }
      if ("name" in data || "description" in data) {
        await Tag.updateEmbeddings(result);
      }
      return result;
    } catch (error) {
      console.error("Error updating tag: ", error);
      return undefined;
    }
  }

  static async checkUserOwnership(
    tagId: string | RecordId,
    userId: string | RecordId
  ): Promise<boolean> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }
      const result = await db.query<[number]>( // Expecting an array with one object: [{ count: number }]
        `count(SELECT id FROM owns WHERE in = $userId AND out = $tagId);`,
        {
          userId: new StringRecordId(userId),
          tagId: new StringRecordId(tagId),
        }
      );

      if (result && result[0] && result[0] > 0) {
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error checking user ownership for tag: ", error);
      return false;
    }
  }
  static async connectToIdea(
    tagId: string | RecordId,
    ideaId: string | RecordId
  ): Promise<ITagDescriptionRelationship | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }

      // Check if the idea and tag exist (optional, but good practice)
      const tag = await Tag.get(tagId);
      if (!tag) throw new Error(`Tag with id ${tagId} not found.`);
      const idea = await Idea.get(ideaId); // Assuming Idea.get() exists
      if (!idea) throw new Error(`Idea with id ${ideaId} not found.`);

      const result = await db.query<[ITagDescriptionRelationship]>(
        `RELATE $tagId ->describes-> $ideaId SET createdAt = $now;`,
        {
          tagId: new StringRecordId(tagId),
          ideaId: new StringRecordId(ideaId),
          now: new Date(),
        }
      );

      if (!result) {
        console.error(`No relationship created for tag "${tagId}" and idea "${ideaId}".`);
        return undefined;
      }
      const [relationship] = result;
      return relationship;
    } catch (err) {
      console.error(`Error during connectToIdea for tag "${tagId}" and idea "${ideaId}":`, err);
      return undefined;
    }
  }

  static async applyToThing(
    tagId: string | RecordId,
    thingId: string | RecordId
  ): Promise<ITagDescriptionRelationship | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }

      const tag = await Tag.get(tagId);
      if (!tag) throw new Error(`Tag with id ${tagId} not found.`);

      const result = await db.query<[ITagDescriptionRelationship]>(
        `RELATE $tagId ->describes-> $thingId SET createdAt = $now;`,
        {
          tagId: new StringRecordId(tagId),
          thingId: new StringRecordId(thingId),
          now: new Date(),
        }
      );

      if (!result) {
        console.error(`No relationship created for tag "${tagId}" and thing "${thingId}".`);
        return undefined;
      }

      const [relationship] = result;
      return relationship;
    } catch (err) {
      console.error(`Error during applyToThing for tag "${tagId}" and thing "${thingId}":`, err);
      return undefined;
    }
  }

  static async removeFromThing(
    tagId: string | RecordId,
    thingId: string | RecordId
  ): Promise<ITagDescriptionRelationship | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }

      const result = await db.query<ITagDescriptionRelationship[]>(
        `DELETE describes WHERE in = $tagId AND out = $thingId;`,
        {
          tagId: new StringRecordId(tagId),
          thingId: new StringRecordId(thingId),
        }
      );

      if (!result || result.length === 0) {
        return undefined;
      }

      return result[0];
    } catch (err) {
      console.error(`Error during removeFromThing for tag "${tagId}" and thing "${thingId}":`, err);
      return undefined;
    }
  }

  static async disconnectFromIdea(
    tagId: string | RecordId,
    ideaId: string | RecordId
  ): Promise<boolean> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }

      // SurrealDB's DELETE relation query is a bit different.
      // We target the edge record directly if we know its ID, or delete based on 'in' and 'out'.
      // Simpler: Delete edges from 'tag' that point to 'idea' with the 'describes' verb.
      const result = await db.query(`DELETE describes WHERE in = $tagId AND out = $ideaId;`, {
        tagId: new StringRecordId(tagId),
        ideaId: new StringRecordId(ideaId),
      });

      // The DELETE query in SurrealDB for relations might not return the deleted record details directly
      // in the same way a SELECT or CREATE does. It often returns an empty array upon success.
      // We'll assume success if no error is thrown, or check if the API provides a way to confirm.
      // For now, if it doesn't throw, we'll consider it a success.
      return true;
    } catch (err) {
      console.error(
        `Error during disconnectFromIdea for tag "${tagId}" and idea "${ideaId}":`,
        err
      );
      return false;
    }
  }

  static async getIdeasForTag(tagId: string | RecordId): Promise<Idea[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }
      const results = await db.run<Idea[]>("fn::get_ideas_for_tag", [new StringRecordId(tagId)]);
      if (!results) {
        console.warn("Error getting ideas for tag or tag has no ideas");
        return []; // Return empty array if no ideas or error
      }
      return results;
    } catch (error) {
      console.error("Error getting ideas for tag: ", error);
      return undefined;
    }
  }

  static async getTagsForIdea(ideaId: string | RecordId): Promise<ITag[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }
      const results = await db.run<ITag[]>("fn::get_tags_for_idea", [new StringRecordId(ideaId)]);
      if (!results) {
        console.warn("Error getting tags for idea or idea has no tags");
        return []; // Return empty array if no ideas or error
      }
      return results;
    } catch (error) {
      console.error("Error getting ideas for tag: ", error);
      return undefined;
    }
  }

  static async getTagThings(tagId: string | RecordId): Promise<ITagDescribes[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }
      const results = await db.query<[ITagDescribes[]]>(
        `
        SELECT VALUE
          ->describes->(?) as describes
        FROM ONLY $tagId
        FETCH describes;
        `,
        {
          tagId: new StringRecordId(tagId),
        }
      );

      if (!results) {
        console.warn("Error getting things for tag or tag has no things");
        return [];
      }

      const [things] = results;

      const connectables = things.map((t) => GraphService.getConnectable(t) || t);

      return connectables;
    } catch (error) {
      console.error("Error getting things for tag: ", error);
      return undefined;
    }
  }

  static async delete(id: string | RecordId): Promise<boolean> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }

      const tagIdObject = new StringRecordId(id);
      const result = await db.delete<ITag>(tagIdObject);

      return result !== undefined && (!Array.isArray(result) || result.length > 0);
    } catch (error) {
      console.error("Error deleting tag: ", error);
      return false;
    }
  }

  static async updateEmbeddings(tag: ITag, force = false) {
    try {
      const embedding = getEmbedder();
      const embeddableContent = `${tag.name}:${tag.description}`;
      if (!embeddableContent) {
        return undefined;
      }
      if (!force && isEmbeddingCurrent(tag, embedding, embeddableContent)) {
        return undefined;
      }
      const vector = await embedding.embedContent(embeddableContent);
      if (!vector) {
        throw new Error("Couldn't get embeddings");
      }
      return await Tag.update(tag.id, {
        ...buildReadyEmbeddingUpdate(embedding, embeddableContent, vector),
      });
    } catch (err) {
      console.error(`Error during updateEmbeddings for tag "${tag.id}":`, err);
      return undefined;
    }
  }

  static async getSimilarToIdea(
    userId: string | RecordId,
    ideaId: string | RecordId,
    options?: {
      limit?: number;
      threshold?: number;
    }
  ): Promise<ITag[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }
      const idea = await Idea.getFull(ideaId);
      if (!idea) {
        throw new Error("Idea not found.");
      }
      if (!idea.embeddings) {
        return;
      }
      const results = await Search.searchTagsByEmbedding(userId, idea.embeddings);
      if (!results) {
        throw new Error("No similar tags found.");
      }
      const mapped = results.map((r) => {
        return r.value as ITag;
      });
      return mapped;
    } catch (error) {
      console.error("Error getting similar tags to idea: ", error);
      return undefined;
    }
  }

  static async getSimilarIdeasToTag(
    tagId: string | RecordId,
    userId: string | RecordId,
    options?: {
      limit?: number;
      threshold?: number;
    }
  ): Promise<IIdea[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }
      const tag = await Tag.get(tagId);
      if (!tag) {
        throw new Error(`Tag with id ${tagId.toString()} not found.`);
      }
      if (!tag.embeddings || tag.embeddings.length === 0) {
        console.warn(`Tag with id ${tagId.toString()} has no embeddings.`);
        return [];
      }

      const results = await db.run<(IIdea & { derivedList: IIdeaDerived[] })[]>(
        "fn::search_ideas_similar_to_tag",
        [new StringRecordId(tagId), new StringRecordId(userId)]
      );

      if (!results) {
        console.warn(
          `No similar ideas found for tag ${tagId.toString()} for user ${userId.toString()}.`
        );
        return [];
      }

      const withDerived = results.map((idea) => {
        return {
          ...idea,
          derived: Idea.mapDerived(idea.derivedList),
        } as IIdea;
      });

      const final = withDerived;

      return final;
    } catch (error) {
      console.error(`Error getting similar ideas for tag ${tagId.toString()}: `, error);
      return undefined;
    }
  }

  static async getFirstKDescribed(id: string | RecordId, k = 3) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }
      const results = await db.query<[ITagDescribes[]]>(
        `
        SELECT VALUE
          ->describes->(?) AS describes
        FROM ONLY $tagId
        LIMIT $k;
        `,
        { tagId: new StringRecordId(id), k }
      );

      if (!results) {
        console.warn(`No ideas found for tag ${id.toString()}.`);
        return [];
      }

      const [firstK] = results;

      return results;
    } catch (error) {
      console.error(`Error getting ideas for tag ${id.toString()}: `, error);
      return undefined;
    }
  }

  static async getTagAverageEmbeddings(tagId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Database not initialized");

      const results = await db.query<[(ITagDescribes & { embeddings: number[] })[]]>(
        `
        SELECT VALUE
          ->describes->(?) as describes
        FROM ONLY $tagId
        FETCH describes;
        `,
        {
          tagId: new StringRecordId(tagId),
        }
      );

      if (!results) {
        throw new Error("Couldn't get results");
      }

      const [described] = results;
      const vectors = described.map((i) => i.embeddings).filter((i) => !!i);

      const averageEmbedding = averageEmbeddings(vectors);

      return averageEmbedding;
    } catch (error) {
      console.error("Error getting average embeddings: ", error);
      return undefined;
    }
  }

  static async getWeightedVector(
    tagEmbedding: number[] | null,
    averageEmbedding: number[] | null
  ): Promise<number[]> {
    const emb = getEmbedder();
    try {
      const blended = blendVectors(tagEmbedding, averageEmbedding, this.SUGGESTION_WEIGHT);
      return blended;
    } catch (error) {
      console.error("Error getting weighted vector: ", error);
      return emb.getEmptyEmbeddings();
    }
  }

  static async cacheCentroidVector(tagId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) throw new Error("Database not initialized");

      const averageEmbeddings = await this.getTagAverageEmbeddings(tagId);

      await Tag.update(tagId, {
        cachedCentroidEmbeddings: averageEmbeddings,
      });

      return averageEmbeddings;
    } catch (error) {
      console.error("Error caching the tag centroid vector: ", error);
      return undefined;
    }
  }

  static async getSimilarThings(
    userId: string | RecordId,
    tagId: string | RecordId,
    options: {
      limit?: number;
      threshold?: number;
      candidates?: number;
    }
  ): Promise<ITagDescribes[] | undefined> {
    const db = await getDatabase();
    if (!db) throw new Error("Database not initialized");

    const limit = options.limit || 25;
    const threshold = Number(options.threshold) || 0.45;

    const results = await db.query<[(ITagDescribes & { embeddings: number[] })[]]>(
      `
        SELECT VALUE
          ->describes->(?) as describes
        FROM ONLY $tagId
        FETCH describes;
        `,
      {
        tagId: new StringRecordId(tagId),
      }
    );

    if (!results) {
      throw new Error("Couldn't get results");
    }

    const [described] = results;

    const tag = await Tag.get(tagId);

    if (!tag) {
      throw new Error("No tag found");
    }

    let tagEmbedding: number[] | null = tag.embeddings;
    if (!tagEmbedding) {
      const updated = await this.updateEmbeddings(tag, true);
      tagEmbedding = updated?.embeddings ?? null;
    }

    // A centroid is derived from the current embeddings of every described item.
    // Recompute it for recommendations so provider changes and content updates
    // cannot leave this search in a stale or incompatible vector space.
    const centroidEmbeddings = (await Tag.getTagAverageEmbeddings(tagId)) ?? null;

    const finalVector = await this.getWeightedVector(
      tagEmbedding || null,
      centroidEmbeddings || null
    );

    const similarThings = await GraphService.searchSimilarConnectables(userId, finalVector, {
      limit,
      threshold,
      exclude: described.map((i) => i.id.toString()),
    });

    if (!similarThings) {
      throw new Error("Couldn't get similar things");
    }

    return similarThings;
  }
}
