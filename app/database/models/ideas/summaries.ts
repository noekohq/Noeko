import { RecordId, StringRecordId } from "surrealdb";
import LM, {
  getLM,
  LMSchema,
  LMSchemaType,
  PromptBuilder,
} from "../../../semantics/lm";
import { Idea, IIdea } from ".";
import { getDatabase } from "../../db";

export type IGenerativeSummary = {
  id: RecordId;
  createdAt: Date;
  sentenceOverview: string;
  sentenceSummary: string;
  paragraphOverview?: string;
  paragraphSummary?: string;
  abstractSummary?: string;
  simplifiedSummary?: string;
  outline?: string[];
  keyPoints?: string[];
  highlights?: string[];
};

export type IGenerativeSummaryForm = Omit<IGenerativeSummary, "id">;

export const GenerativeSummarySchema: LMSchema = {
  type: LMSchemaType.OBJECT,
  properties: {
    sentenceOverview: {
      type: LMSchemaType.STRING,
      description:
        "A single sentence long descriptive overview of the content.",
    },
    sentenceSummary: {
      type: LMSchemaType.STRING,
      description: "A single sentence long summary of the content.",
    },
    paragraphOverview: {
      type: LMSchemaType.STRING,
      description:
        "A single paragraph long descriptive overview of the content.",
    },
    paragraphSummary: {
      type: LMSchemaType.STRING,
      description: "A single paragraph long summary of the content.",
    },
    abstractSummary: {
      type: LMSchemaType.STRING,
      description: "An abstract summary of the content.",
    },
    simplifiedSummary: {
      type: LMSchemaType.STRING,
      description: "A simplified (ELI5) summary of the content.",
    },
    outline: {
      type: LMSchemaType.ARRAY,
      items: { type: LMSchemaType.STRING },
      description: "An outline of the content's structure.",
    },
    keyPoints: {
      type: LMSchemaType.ARRAY,
      items: { type: LMSchemaType.STRING },
      description: "Key points made in the content.",
    },
    highlights: {
      type: LMSchemaType.ARRAY,
      items: { type: LMSchemaType.STRING },
      description: "Highlights extracted from the content.",
    },
  },
  required: ["sentenceOverview", "sentenceSummary"],
};

export class GenerativeSummary {
  constructor() {}

  static async getPromptFromContent(content: string) {
    const prompt = new PromptBuilder()
      .addText(
        "Generate a summary given the schema and the content below. Include properties which are relevant, and skip properties that are unnecessary. The content is as follows:",
      )
      .addBlock("Content", content);
    return prompt;
  }

  static async create(ideaId: string | RecordId) {
    try {
      const db = await getDatabase();
      const idea = await Idea.get(ideaId);
      if (!idea) {
        throw new Error(`Idea with ID ${ideaId} not found`);
      }
      const contentToGenerate = idea.contentPlain;
      if (!contentToGenerate) {
        throw new Error(`Idea with ID ${ideaId} has no content`);
      }
      const generation =
        await GenerativeSummary.getGenerativeSummaryFromContent(
          contentToGenerate,
        );
      if (!generation) {
        throw new Error(
          `Failed to generate summary for idea with ID ${ideaId}`,
        );
      }
      const result = await db?.insert<
        IGenerativeSummary,
        IGenerativeSummaryForm
      >("generative_summary", {
        createdAt: new Date(),
        sentenceOverview: generation.sentenceOverview,
        sentenceSummary: generation.sentenceSummary,
        paragraphOverview: generation.paragraphOverview,
        paragraphSummary: generation.paragraphSummary,
        abstractSummary: generation.abstractSummary,
        simplifiedSummary: generation.simplifiedSummary,
        outline: generation.outline,
        keyPoints: generation.keyPoints,
        highlights: generation.highlights,
      });
      if (!result) {
        throw new Error(
          `Failed to create generative summary for idea with ID ${ideaId}`,
        );
      }
      const [generativeSummary] = result;
      await db?.query(`RELATE $ideaId->is_source_for->$summaryId;`, {
        ideaId: idea.id,
        summaryId: generativeSummary.id,
      });
      return generativeSummary;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }

  static async deleteCascade(ideaId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not available");
      }
      const derivedSummariesResults = await db?.query<[RecordId[]]>(
        `SELECT VALUE ->is_source_for->generative_summary FROM ONLY <record> $ideaId;`,
        { ideaId },
      );
      if (!derivedSummariesResults) {
        throw new Error("Failed to fetch derived summaries");
      }
      const [derivedSummaries] = derivedSummariesResults;
      if (!derivedSummaries || derivedSummaries.length < 1) {
        return true;
      }
      for (const summary of derivedSummaries) {
        await this.delete(summary);
      }
      return true;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }

  static async delete(summaryId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not available");
      }
      const result = await db?.delete(new StringRecordId(summaryId));
      return result;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }

  static async getGenerativeSummaryFromContent(
    content: string,
  ): Promise<IGenerativeSummaryForm | undefined> {
    try {
      const lm = getLM().withModel("simple");
      const prompt = await this.getPromptFromContent(content);
      const generation = await lm?.generateJSON<IGenerativeSummaryForm>(
        prompt.get(),
        GenerativeSummarySchema,
      );
      if (!generation) {
        throw new Error("Failed to generate summary");
      }
      return generation;
    } catch (error) {
      console.error("Error generating summary: ", error);
      return undefined;
    }
  }

  static async refreshGenerativeSummary(summaryId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not available");
      }
      const sourceResults = await db.query<[IIdea[]]>(
        `SELECT VALUE <-is_source_for<-idea as sourceIdeas FROM ONLY <record> $summaryId FETCH sourceIdeas;`,
        {
          summaryId:
            typeof summaryId === "string"
              ? new StringRecordId(summaryId)
              : summaryId,
        },
      );
      if (!sourceResults) {
        throw new Error("Failed to fetch source ideas");
      }
      const [sourceIdea] = sourceResults[0];
      if (!sourceIdea) {
        throw new Error("No source idea found.");
      }
      const { content } = sourceIdea;
      const lm = getLM();
      const prompt = await this.getPromptFromContent(content);
      const generation = await lm.generateJSON<IGenerativeSummaryForm>(
        prompt.get(),
        GenerativeSummarySchema,
      );
      if (!generation) {
        throw new Error("Failed to generate summary");
      }
      const update = await db.update<
        IGenerativeSummary,
        IGenerativeSummaryForm
      >(new StringRecordId(summaryId), {
        ...generation,
      });
      return update;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }

  static async cascadeGenerativeSummary(ideaId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not available");
      }
      const derivedSummariesResults = await db?.query<[IGenerativeSummary[]]>(
        `SELECT VALUE ->is_source_for->generative_summary as derivedSummaries FROM ONLY $ideaId FETCH derivedSummaries;`,
        { ideaId },
      );
      if (!derivedSummariesResults) {
        throw new Error("Failed to fetch derived summaries");
      }
      const [derivedSummaries] = derivedSummariesResults;
      if (!derivedSummaries || derivedSummaries.length < 1) {
        const newSummary = await this.create(ideaId);
        if (!newSummary) {
          return false;
        }
        return true;
      }
      for (const summary of derivedSummaries) {
        await this.refreshGenerativeSummary(summary.id);
      }
      return true;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }
}
