import OpenAI from "openai";
import { IModelMap, LMProvider, IModelTypes, LMSchema } from "..";
import { LMUtils } from "../utils";
import { ResponseFormatJSONSchema } from "openai/resources/shared.mjs";
import { SchemaConverter } from "../helpers";

const API_KEY = process.env.XAI_API_KEY;

const ModelMap: IModelMap = {
  simple: "grok-4-fast",
  advanced: "grok-4-fast-reasoning",
  "fast-accurate": "grok-4-fast-reasoning",
  general: "grok-4-fast-reasoning",
};

const getClient = () => {
  if (!API_KEY) {
    throw new Error("No XAI_API_KEY provided.");
  }
  const client = new OpenAI({
    apiKey: API_KEY,
    baseURL: "https://api.x.ai/v1",
    timeout: 360000,
  });
  return client;
};

export class XAIProvider implements LMProvider {
  private client: OpenAI;
  private _utils: LMUtils;
  private _model: string;
  private _modelMap: IModelMap = ModelMap;
  public static maxCharacters = 500000;

  constructor() {
    this.client = getClient();
    this._utils = new LMUtils(this);
    this._model = ModelMap.general;
  }

  get utils() {
    return this._utils;
  }

  get model() {
    return this._model;
  }

  get modelMap() {
    return this._modelMap;
  }

  public static getSchema(
    schema: LMSchema,
  ): ResponseFormatJSONSchema.JSONSchema {
    return SchemaConverter.getJSONSchema(schema);
  }

  public static truncate(content: string) {
    return content.length > XAIProvider.maxCharacters
      ? content.slice(0, XAIProvider.maxCharacters) +
          "...[FURTHER CONTENT TRUNCATED]..."
      : content;
  }

  public withModel(model: string | IModelTypes): LMProvider {
    this._model = this.modelMap[model as IModelTypes] ?? model;
    return this;
  }

  /**
   * Note: The "thinking" feature with a budget is specific to the Gemini API.
   * This method is implemented as a no-op to satisfy the LMProvider interface
   * and allow for consistent chaining, but it does not affect the XAI provider's behavior.
   */
  public withThinking(budget?: number): LMProvider {
    // No-op for XAI/OpenAI compatibility.
    return this;
  }

  public async generate(prompt: string) {
    try {
      const truncatedPrompt = XAIProvider.truncate(prompt);
      const result = await this.client.chat.completions.create({
        model: this._model,
        messages: [
          {
            role: "user",
            content: truncatedPrompt,
          },
        ],
      });
      const text = result.choices[0].message.content;
      if (!text) {
        throw new Error("Model returned no choices!");
      }
      return text;
    } catch (error) {
      console.error("Couldn't generate prompt: ", error);
      return null;
    }
  }

  public async generateJSON<T>(
    prompt: string,
    schema: LMSchema,
  ): Promise<T | null> {
    try {
      const truncatedPrompt = XAIProvider.truncate(prompt);
      const result = await this.client.chat.completions.create({
        model: this._model,
        messages: [
          {
            role: "user",
            content: truncatedPrompt,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: XAIProvider.getSchema(schema),
        },
      });
      const text = result.choices[0].message.content;
      if (!text) {
        throw new Error("Model returned no choices!");
      }
      return JSON.parse(text);
    } catch (error) {
      console.error("Error generating JSON: ", error);
      return null;
    }
  }

  public async *generateStream(
    prompt: string,
  ): AsyncGenerator<string, void, unknown> {
    try {
      const truncatedPrompt = XAIProvider.truncate(prompt);
      const stream = await this.client.chat.completions.create({
        model: this._model,
        messages: [
          {
            role: "user",
            content: truncatedPrompt,
          },
        ],
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (err) {
      console.error("Error generating stream:", err);
      throw err;
    }
  }

  public async *generateJSONStream(
    prompt: string,
    schema: LMSchema,
  ): AsyncGenerator<string, void, unknown> {
    try {
      const truncatedPrompt = XAIProvider.truncate(prompt);
      const stream = await this.client.chat.completions.create({
        model: this._model,
        messages: [
          {
            role: "user",
            content: truncatedPrompt,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: XAIProvider.getSchema(schema),
        },
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (err) {
      console.error("Error generating JSON stream:", err);
      throw err;
    }
  }
}
