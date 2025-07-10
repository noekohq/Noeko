import {
  GenerateContentResponse,
  GoogleGenAI,
  Schema,
  HarmCategory,
  HarmBlockThreshold,
  GenerateContentConfig,
  Type,
} from "@google/genai";

const apiKeyName = "GEMINI_API_KEY";

const API_KEY = process.env[apiKeyName];

if (!API_KEY) {
  throw new Error(`${apiKeyName} is not defined. Is it set in ".env"?`);
}

export type LMSchema = Schema;
export const LMSchemaType = Type;

type ModelTypes = "simple" | "advanced" | "fast-accurate" | "general";

const ModelMapper: Record<ModelTypes, string> = {
  simple: "gemini-1.5-flash-latest",
  advanced: "gemini-1.5-pro-latest",
  "fast-accurate": "gemini-1.5-flash-latest",
  general: "gemini-1.5-flash-latest",
};

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

  addBlock(title: string, content: string, level = 1) {
    const numPounds = Array(level).fill("#").join("");
    this._prompt += `\n---\n${numPounds} ${title}\n${content}\n`;
    return this;
  }

  addList(title: string, content: string[]) {
    this._prompt += `\n---# ${title}\n${content.map((c) => c).join("\n-")}\n`;
    return this;
  }
}

export type LanguageModelConfig = {
  apiKey: string;
};

export default class LM {
  private client: GoogleGenAI;
  private _utils: LMUtils;
  private _model: string;

  constructor({ apiKey }: LanguageModelConfig) {
    this.client = new GoogleGenAI({ apiKey });
    this._utils = new LMUtils(this);
    this._model = "simple"; // Default model
  }

  private getGenerationConfig(schema?: Schema): GenerateContentConfig {
    const config: GenerateContentConfig = {
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    };

    if (schema) {
      config.responseMimeType = "application/json";
      config.responseSchema = schema;
    }

    return config;
  }

  get utils() {
    return this._utils;
  }

  get model() {
    return this._model;
  }

  public withModel(model: string | ModelTypes) {
    this._model = ModelMapper[model as ModelTypes] ?? model;
    return this;
  }

  async generate(prompt: string): Promise<GenerateContentResponse | null> {
    try {
      const result = await this.client.models.generateContent({
        model: this._model,
        contents: prompt,
        config: this.getGenerationConfig(),
      });
      return result;
    } catch (err) {
      console.error("Error generating content:", err);
      return null;
    }
  }

  async generateJSON<T>(prompt: string, schema: LMSchema): Promise<T | null> {
    try {
      const result = await this.client.models.generateContent({
        model: this._model,
        contents: prompt,
        config: this.getGenerationConfig(schema),
      });
      if (!result || !result.text) {
        console.error("Invalid response");
        return null;
      }
      const parsed = JSON.parse(result.text) as T;
      if (!parsed) {
        console.error("Invalid JSON response");
        return null;
      }
      return parsed;
    } catch (err) {
      console.error("Error generating JSON:", err);
      return null;
    }
  }

  async *generateJSONStream(
    prompt: string,
    schema: Schema,
  ): AsyncGenerator<string, void, unknown> {
    try {
      const result = await this.client.models.generateContentStream({
        model: this._model,
        contents: prompt,
        config: this.getGenerationConfig(schema),
      });

      for await (const chunk of result) {
        const chunkText = chunk.text;
        if (chunkText) {
          yield chunkText;
        }
      }
    } catch (err) {
      console.error("Error generating JSON stream:", err);
      throw err;
    }
  }

  async *generateStream(prompt: string): AsyncGenerator<string, void, unknown> {
    try {
      const result = await this.client.models.generateContentStream({
        model: this._model,
        contents: prompt,
        config: this.getGenerationConfig(),
      });
      for await (const chunk of result) {
        const chunkText = chunk.text;
        if (chunkText) {
          yield chunkText;
        }
      }
    } catch (err) {
      console.error("Error generating stream:", err);
      throw err;
    }
  }
}

export const getLM = () => {
  if (!API_KEY) {
    throw new Error(`${apiKeyName} is not defined`);
  }
  return new LM({ apiKey: API_KEY });
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
        type: Type.OBJECT,
        properties: {
          text: {
            type: Type.STRING,
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

  async entitle(content: string, description: string): Promise<string | null> {
    try {
      const prompt = new PromptBuilder()
        .addText(
          `Please write a ${description} title for the following content`,
        )
        .addText(content)
        .get();
      const result = await this.lm.generateJSON<{ text: string }>(prompt, {
        type: Type.OBJECT,
        properties: {
          text: {
            type: Type.STRING,
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
