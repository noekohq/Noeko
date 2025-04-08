import { RecordId, StringRecordId } from "surrealdb";
import LM, {
  getLM,
  LMSchema,
  LMSchemaType,
  PromptBuilder,
} from "../../../semantics/lm";
import { Idea } from ".";

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

  static async create(ideaId: string) {
    try {
      const idea = await Idea.get(ideaId);
      if (!idea) {
        throw new Error(`Idea with ID ${ideaId} not found`);
      }
      const generation =
        await GenerativeSummary.getGenerativeSummaryFromContent(idea.content);
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
      const prompt = new PromptBuilder()
        .addText(
          "Generate a summary given the schema and the following content:",
        )
        .addBlock("Content", content);
      const generation = await lm?.generateJSON<IGenerativeSummaryForm>(
        prompt.get(),
        GenerativeSummarySchema,
      );
      if (!generation) {
        throw new Error("Failed to generate summary");
      }
      return generation;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }
}
