import { RecordId, StringRecordId } from "surrealdb";
import { getDatabase } from "../db";
import { User } from "./user";
import { Idea, IIdea, IIdeaDerived } from "./ideas"; // Assuming Idea model is in this path
import { getEmbedder } from "../../ai/embeddings/embeddings";
import { getLM } from "../../ai/lms/lm";
import { LMSchemaType } from "../../ai/lms";
import { PromptBuilder } from "../../ai/lms/utils";
import { Search } from "../../services/Search";

type ITagDescribes = IIdea;

export type ITag = {
  id: string | RecordId;
  name: string;
  description: string;
  color?: string; // Optional: hex code for tag color
  embeddings: number[] | null;
  describes: ITagDescribes;
  embeddingsUpdatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type ITagForm = Omit<
  ITag,
  | "id"
  | "embeddings"
  | "describes"
  | "embeddingsUpdatedAt"
  | "createdAt"
  | "updatedAt"
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
      const result = await db.run<ITag>("fn::get_tag", [
        new StringRecordId(id),
      ]);
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
        return undefined;
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
  ): Promise<ITag[] | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }
      const results = await db.run<ITag[]>("fn::get_tags_for_idea", [
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
      const result = await db.delete<ITag>(tagIdObject);

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
      const embedding = getEmbedder();
      const embeddableContent = `${tag.name}:${tag.description}`;
      if (!embeddableContent) {
        return undefined;
      }
      const vector = await embedding.embedContent(embeddableContent);
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
      const results = await Search.searchTagsByEmbedding(
        userId,
        idea.embeddings,
      );
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
    },
  ): Promise<Idea[] | undefined> {
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
        [new StringRecordId(tagId), new StringRecordId(userId)],
      );

      if (!results) {
        console.warn(
          `No similar ideas found for tag ${tagId.toString()} for user ${userId.toString()}.`,
        );
        return [];
      }

      const withDerived = results.map((idea) => {
        return {
          ...idea,
          derived: Idea.mapDerived(idea.derivedList),
        } as Idea;
      });

      const final = withDerived;

      return final;
    } catch (error) {
      console.error(
        `Error getting similar ideas for tag ${tagId.toString()}: `,
        error,
      );
      return undefined;
    }
  }

  static async getFirstKDescribed(id: string | RecordId, k = 3) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Error getting database");
      }
      const results = await db.query<[ITagDescribes]>(
        `
        SELECT
          ->describes->(?) AS describes
        FROM ONLY $tag
        FETCH describes;
        `,
        {
          tag: id,
          limit: k,
        },
      );
      if (!results) {
        throw new Error("Error getting first n described");
      }
      const [firstN] = results;
      return firstN;
    } catch (error) {
      console.error(`Error fetching first k: `, k);
      return undefined;
    }
  }

  static async suggestNewTagsForContent(content: string, existingTags: ITag[]) {
    try {
      const prompt = new PromptBuilder()
        .addBlock(
          "Instructions",
          `
            You are a tag suggestion engine. Your task is to analyze the provided content and suggest a diverse list of accurate and useful classification tags.

            **Key Guidelines for Tag Generation:**

            1.  **No Duplicates:** Ensure your suggested tags are new and NOT present in the provided "Existing Tags" list.
            2.  **Create a "Gradient" of Tags – Spanning Broad to Specific:**
                * **Spectrum of Specificity:** Your suggestions should cover a range:
                    * **Very Broad:** General categories, fields, or high-level concepts (e.g., "science," "arts," "business," "technology," "health," "education").
                    * **Mid-Range Thematic:** More focused themes, systems, or methodologies (e.g., "particle physics," "impressionist art," "market analysis," "mobile application development," "preventive medicine," "online learning platforms").
                    * **Fairly Specific (but Reusable):** Key components, techniques, specific theories, or distinct topics that are still recognizable and useful for categorizing other similar items (e.g., "Higgs boson," "color theory," "SWOT analysis," "user interface design," "vaccine development," "gamification strategies").
                * **General Utility:** All tags, particularly the more specific ones, must retain general usefulness for broader categorization and discovery. Avoid hyper-specific tags that would *only* apply to the exact piece of content.
                * **Varied Tag Types (apply the above spectrum to these):**
                    * **Action/Process-Oriented:** Verbs describing activities (e.g., "researching," "authoring," "evaluating," "performing," "manufacturing," "diagnosing"). These can vary in their implied scope.
                    * **Conceptual/Abstract:** Broader ideas or principles (often aligning with Very Broad or Mid-Range, e.g., "innovation," "ethics," "sustainability," "data privacy," "frameworks," "usability").
                    * **Topic-Specific (Reusable):** Key subjects/entities (often Mid-Range or Fairly Specific, as illustrated in the example below).
            3.  **Illustrative Example (Applying the Spectrum):**
                For content describing "a detailed review of a new open-source photo editing software called 'FotoFix'":
                * *Very Broad:* "software," "technology," "digital media," "creative tools"
                * *Mid-Range:* "photo editing," "open-source applications," "graphics software," "software reviews," "image manipulation"
                * *Fairly Specific (but Reusable):* "FotoFix" (if the software itself is a recognizable entity or could become one), "raster graphics editing," "non-destructive filters," "user interface critique," "workflow efficiency"
            4.  **Enhance Discoverability:** Tags should help users find the content via search and reflect its multiple facets.
          `,
        )
        .addBlock("Content", `${content}`)
        .addList("Existing tags", [
          ...existingTags.map((t) => {
            return `${t.name}: ${t.description}`;
          }),
        ]);

      const lm = getLM().withModel("simple");
      const tags = await lm.generateJSON<
        { name: string; description: string }[]
      >(prompt.get(), {
        type: LMSchemaType.ARRAY,
        items: {
          type: LMSchemaType.OBJECT,
          description: "The specific tag in question",
          properties: {
            name: {
              type: LMSchemaType.STRING,
              description: "The name of the tag",
            },
            description: {
              type: LMSchemaType.STRING,
              description: "What the tag describes about the content",
            },
          },
          required: ["name", "description"],
        },
      });
      if (!tags) {
        throw new Error("No tags generated.");
      }
      return tags;
    } catch (error) {
      console.error("Error suggesting tags: ", error);
      return undefined;
    }
  }
}
