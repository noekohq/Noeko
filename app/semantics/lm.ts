import {
  GenerateContentResult,
  GenerativeModel,
  GoogleGenerativeAI,
  ResponseSchema,
  SchemaType,
} from "@google/generative-ai";

const apiKeyName = "GEMINI_API_KEY";

const API_KEY = process.env[apiKeyName];

if (!API_KEY) {
  throw new Error(`${apiKeyName} is not defined. Is it set in ".env"?`);
}

export type LMSchema = ResponseSchema;

export class PromptBuilder {
  private _prompt: string = "";

  constructor() {}

  get() {
    return this._prompt;
  }

  addText(text: string) {
    this._prompt += text;
    return this;
  }

  addBlock(title: string, content: string) {
    this._prompt += `\n---\n${title}\n${content}\n`;
    return this;
  }
}

export type LanguageModelConfig = {
  apiKey: string;
};

export default class LM {
  private client: GoogleGenerativeAI;
  private _utils: LMUtils;
  private _model: string;

  constructor({ apiKey }: LanguageModelConfig) {
    this.client = new GoogleGenerativeAI(apiKey);
    this._utils = new LMUtils(this);
    this._model = "models/gemini-2.0-flash-lite";
  }

  getModel(options?: Partial<{ model: string; schema: ResponseSchema }>) {
    return this.client.getGenerativeModel({
      model: options?.model ?? this._model,
      generationConfig: {
        responseMimeType: options?.schema ? "application/json" : "text/plain",
        responseSchema: options?.schema,
      },
    });
  }

  get utils() {
    return this._utils;
  }

  get model() {
    return this.getModel();
  }

  public withModel(model: string) {
    this._model = model;
    return this;
  }

  async generate(
    prompt: string,
  ): Promise<GenerateContentResult["response"] | null> {
    try {
      const result = await this.model.generateContent(prompt);
      return result.response;
    } catch (err) {
      console.error("Error generating content:", err);
      return null;
    }
  }

  async generateJSON<T>(
    prompt: string,
    schema: ResponseSchema,
  ): Promise<T | null> {
    try {
      const result = await this.getModel({ schema }).generateContent(prompt);
      return JSON.parse(result.response.text()) as T;
    } catch (err) {
      console.error("Error generating JSON:", err);
      return null;
    }
  }
}

export const getLM = () => {
  if (!process.env[apiKeyName]) {
    throw new Error(`${apiKeyName} is not defined`);
  }
  return new LM({ apiKey: process.env[apiKeyName] });
};

export class LMUtils {
  lm: LM;

  constructor(lm: LM) {
    this.lm = lm;
  }

  async summarize(
    text: string,
    length: "sentence" | "couple sentences" | "paragraph",
  ): Promise<string | null> {
    try {
      const prompt = new PromptBuilder()
        .addText(`Please summarize the following content into a ${length}`)
        .addText(text)
        .get();
      const result = await this.lm.generateJSON<{ text: string }>(prompt, {
        type: SchemaType.OBJECT,
        properties: {
          text: {
            type: SchemaType.STRING,
            description: "The summary of the text",
          },
        },
        required: ["text"],
      });
      if (!result) {
        throw Error("Error generating summary");
      }
      if (!result.text) {
        throw Error("Error generating summary");
      }
      return result.text;
    } catch (err) {
      console.error("Error generating summary:", err);
      return null;
    }
  }

  async entitle(content: string, description: string) {
    try {
      const prompt = new PromptBuilder()
        .addText(
          `Please write a ${description} title for the following content`,
        )
        .addText(content)
        .get();
      const result = await this.lm.generateJSON<{ text: string }>(prompt, {
        type: SchemaType.OBJECT,
        properties: {
          text: {
            type: SchemaType.STRING,
            description: "The entitle of the text",
          },
        },
        required: ["text"],
      });
      if (!result) {
        throw Error("Error generating entitle");
      }
      if (!result.text) {
        throw Error("Error generating entitle");
      }
      return result.text;
    } catch (err) {
      console.error("Error generating entitle:", err);
      return null;
    }
  }
}
