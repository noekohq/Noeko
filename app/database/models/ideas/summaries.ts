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
  sentenceSummary: string;
  paragraphSummary: string;
  abstractSummary: string;
  simplifiedSummary: string;
  outline: string[];
  keyPoints: string[];
  highlights: string[];
};

export type IGenerativeSummaryForm = Omit<IGenerativeSummary, "id">;

export const GenerativeSummarySchema: LMSchema = {
  type: LMSchemaType.OBJECT,
  properties: {
    sentenceSummary: {
      type: LMSchemaType.STRING,
      description: "A single sentence long summary of the content.",
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
  required: [
    "sentenceSummary",
    "paragraphSummary",
    "abstractSummary",
    "simplifiedSummary",
    "outline",
    "keyPoints",
    "highlights",
  ],
};

export class GenerativeSummary {
  constructor() {}

  static async getPromptFromContent(content: string) {
    const prompt = new PromptBuilder()
      .addText("Generate a summary given the schema and the following content:")
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
      const generation =
        await GenerativeSummary.getGenerativeSummaryFromContent(idea.content);
      if (!generation) {
        throw new Error(
          `Failed to generate summary for idea with ID ${ideaId}`,
        );
      }
      const result = await db?.insert<
        IGenerativeSummary,
        IGenerativeSummaryForm
      >("generative_summary", {
        sentenceSummary: generation.sentenceSummary,
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

  static async getGenerativeSummaryFromContent(
    content: string,
  ): Promise<IGenerativeSummaryForm | undefined> {
    try {
      const lm = getLM().withModel("advanced");
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

  static async refreshGenerativeSummary(summaryId: string) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not available");
      }
      const sourceResults = await db.query<[IIdea[]]>(
        `SELECT VALUE <-is_source_for<-idea as sourceIdeas FROM ONLY $summaryId FETCH sourceIdeas;`,
        { summaryId },
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

  static async cascadeGenerativeSummary(ideaId: string) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not available");
      }
      const derivedSummariesResults = await db?.query<[IGenerativeSummary[]]>(
        `SELECT VALUE ->is_source_for->generative_summary FROM ONLY $ideaId;`,
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
        await this.refreshGenerativeSummary(summary.id.toString());
      }
      return true;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }
}
