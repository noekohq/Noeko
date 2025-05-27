import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../db";
import { User } from "./user";
import { Idea } from "./ideas"; // Assuming Idea model is in this path
import { Embeddings } from "../../semantics/embeddings";
import { htmlToMarkdown } from "../../utils/formatting";

export type ITag = {
  id: string | RecordId;
  name: string;
  description: string;
  color?: string; // Optional: hex code for tag color
  embeddings: number[] | null;
  embeddingsUpdatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type ITagForm = Omit<
  ITag,
  "id" | "embeddings" | "embeddingsUpdatedAt" | "createdAt" | "updatedAt"
>;

export type ITagUserOwnership = {
  id: string | RecordId;
  in: string | RecordId; // User ID
  out: string | RecordId; // Tag ID
  createdAt: Date;
};

export type ITagIdeaRelationship = {
  id: string | RecordId;
  in: string | RecordId; // Tag ID
  out: string | RecordId; // Idea ID
  createdAt: Date;
};

export class Tag {
  static async up() {
    const db = await getDatabase();
    if (!db) {
      throw new Error("Something went wrong getting the database");
    }

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

    await db.query(getUserTagsFunction());
    await db.query(getIdeasForTagFunction());
    await db.query(getTagsForIdeaFunction());
  }

  static async create(
    data: ITagForm,
    userId: string | RecordId,
  ): Promise<ITag | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database to create tag");
      }

      const user = await User.get(userId);
      if (!user) {
        throw new Error("Tried to create tag for a user that does not exist");
      }

      const result = await db.create<
        ITag,
        ITagForm & { createdAt: Date; updatedAt: Date }
      >("tag", {
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
      const result = await db.select<ITag>(new StringRecordId(id));
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

  static async getUserTags(
    userId: string | RecordId,
  ): Promise<ITag[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }
      const result = await db.run<ITag[]>("fn::get_user_tags", [
        new StringRecordId(userId),
      ]);
      if (!result) {
        console.warn("Error getting user tags or user has no tags");
        return []; // Return empty array if no tags or error
      }
      return result;
    } catch (error) {
      console.error("Error getting user tags: ", error);
      return undefined;
    }
  }

  static async update(
    id: string | RecordId,
    data: Partial<
      ITagForm & { embeddings: number[]; embeddingsUpdatedAt: Date }
    >,
  ): Promise<ITag | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }
      const result = await db.merge<
        ITag,
        Partial<ITagForm> & { updatedAt: Date }
      >(new StringRecordId(id), {
        ...data,
        updatedAt: new Date(),
      });
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
    userId: string | RecordId,
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
        },
      );

      console.log("Count: ", result);

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
    ideaId: string | RecordId,
  ): Promise<ITagIdeaRelationship | undefined> {
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

      const result = await db.query<[ITagIdeaRelationship]>(
        `RELATE $tagId ->describes-> $ideaId SET createdAt = $now;`,
        {
          tagId: new StringRecordId(tagId),
          ideaId: new StringRecordId(ideaId),
          now: new Date(),
        },
      );

      if (!result) {
        console.error(
          `No relationship created for tag "${tagId}" and idea "${ideaId}".`,
        );
        return undefined;
      }
      const [relationship] = result;
      return relationship;
    } catch (err) {
      console.error(
        `Error during connectToIdea for tag "${tagId}" and idea "${ideaId}":`,
        err,
      );
      return undefined;
    }
  }

  static async disconnectFromIdea(
    tagId: string | RecordId,
    ideaId: string | RecordId,
  ): Promise<boolean> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }

      // SurrealDB's DELETE relation query is a bit different.
      // We target the edge record directly if we know its ID, or delete based on 'in' and 'out'.
      // Simpler: Delete edges from 'tag' that point to 'idea' with the 'describes' verb.
      const result = await db.query(
        `DELETE describes WHERE in = $tagId AND out = $ideaId;`,
        {
          tagId: new StringRecordId(tagId),
          ideaId: new StringRecordId(ideaId),
        },
      );

      // The DELETE query in SurrealDB for relations might not return the deleted record details directly
      // in the same way a SELECT or CREATE does. It often returns an empty array upon success.
      // We'll assume success if no error is thrown, or check if the API provides a way to confirm.
      // For now, if it doesn't throw, we'll consider it a success.
      return true;
    } catch (err) {
      console.error(
        `Error during disconnectFromIdea for tag "${tagId}" and idea "${ideaId}":`,
        err,
      );
      return false;
    }
  }

  static async getIdeasForTag(
    tagId: string | RecordId,
  ): Promise<Idea[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }
      const results = await db.run<Idea[]>("fn::get_ideas_for_tag", [
        new StringRecordId(tagId),
      ]);
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

  static async getTagsForIdea(
    ideaId: string | RecordId,
  ): Promise<Tag[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }
      const results = await db.run<Idea[]>("fn::get_tags_for_idea", [
        new StringRecordId(ideaId),
      ]);
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

  static async delete(id: string | RecordId): Promise<boolean> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }

      const tagIdObject = new StringRecordId(id);

      // 1. Delete 'owns_tag' relationships pointing to this tag
      // We need to find users who own this tag first, or use a more general query if SurrealDB supports it.
      // A simple way for now is to assume we don't need to find users first if the relation query is general enough.
      // DELETE owns_tag WHERE out = $tagId;
      await db.query(`DELETE owns_tag WHERE out = $tagId;`, {
        tagId: tagIdObject,
      });

      // 2. Delete 'describes' relationships originating from this tag
      await db.query(`DELETE describes WHERE in = $tagId;`, {
        tagId: tagIdObject,
      });

      // 3. Delete the tag itself
      const result = await db.delete<ITag>(tagIdObject);

      // db.delete returns the deleted record or an array of them.
      // If it's successful and the record existed, result will be the record.
      // If the record didn't exist, it might return undefined or an empty array depending on SurrealDB client version.
      return (
        result !== undefined && (!Array.isArray(result) || result.length > 0)
      );
    } catch (error) {
      console.error("Error deleting tag: ", error);
      return false;
    }
  }

  static async updateEmbeddings(tag: ITag, force = false) {
    try {
      if (
        !force &&
        tag.embeddingsUpdatedAt >= tag.updatedAt &&
        tag.embeddings?.length !== 0
      ) {
        return undefined;
      }
      const embedding = new Embeddings();
      const embeddableContent = `${tag.name}:${tag.description}`;
      if (!embeddableContent) {
        return undefined;
      }
      const vector = await embedding.generateEmbeddings(embeddableContent);
      if (!vector) {
        throw new Error("Couldn't get embeddings");
      }
      return await Tag.update(tag.id, {
        embeddings: vector,
        embeddingsUpdatedAt: new Date(),
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
    },
  ) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }
      const idea = await Idea.get(ideaId);
      if (!idea) {
        throw new Error("Idea not found.");
      }
      const results = await db.run<ITag[]>(
        "fn::search_similar_tags_to_embeddings",
        [
          idea.embeddings,
          new StringRecordId(userId),
          options?.limit,
          options?.threshold || 0.4,
        ],
      );
      if (!results) {
      }
      return results;
    } catch (error) {
      console.error("Error getting similar tags to idea: ", error);
      return undefined;
    }
  }
}
