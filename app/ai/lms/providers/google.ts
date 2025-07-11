import {
  GenerateContentConfig,
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/genai";
import { IModelMap, LMProvider, IModelTypes, LMSchema } from "..";
import { LMUtils } from "../utils";

const API_KEY = process.env.GEMINI_API_KEY;
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
const GCP_LOCATION = process.env.GCP_LOCATION || "us-west1";

const ModelMap: IModelMap = {
  simple: "gemini-2.0-flash-lite-001",
  advanced: "gemini-2.5-pro",
  "fast-accurate": "gemini-2.5-flash",
  general: "gemini-2.5-flash",
};

export default class GeminiProvider implements LMProvider {
  private client: GoogleGenAI;
  private _utils: LMUtils;
  private _model: string;
  private _modelMap: IModelMap = ModelMap;
  private _thinking: boolean = false;
  private _thinkingBudget: number = -1;

  constructor() {
    this.client = new GoogleGenAI(
      GCP_PROJECT_ID
        ? {
            vertexai: true,
            project: GCP_PROJECT_ID,
            location: GCP_LOCATION,
          }
        : {
            apiKey: API_KEY,
          },
    );
    this._utils = new LMUtils(this);
    this._model = ModelMap.simple;
    this._thinking = false;
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
  private get canThink() {
    const thinkingModels = [
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
    ];
    if (thinkingModels.includes(this.model)) {
      return true;
    }
    return false;
  }

  public withModel(model: string | IModelTypes) {
    this._model = this.modelMap[model as IModelTypes] ?? model;
    return this;
  }

  public withThinking(thinkingBudget?: number) {
    if (thinkingBudget) {
      this._thinkingBudget = thinkingBudget;
    } else {
      this._thinkingBudget = -1;
    }
    this._thinking = true;
    return this;
  }

  private getGenerationConfig(schema?: LMSchema): GenerateContentConfig {
    const config: GenerateContentConfig = {
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
      ...(this.canThink
        ? {
            thinkingConfig: {
              thinkingBudget: this._thinkingBudget,
              includeThoughts: this._thinking,
            },
          }
        : {}),
    };

    if (schema) {
      config.responseMimeType = "application/json";
      config.responseSchema = schema;
    }

    return config;
  }

  async generate(prompt: string): Promise<string | null> {
    try {
      const result = await this.client.models.generateContent({
        model: this._model,
        contents: prompt,
        config: this.getGenerationConfig(),
      });
      const text = result.text;
      if (!text) {
        return null;
      }
      return text;
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
    schema: LMSchema,
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
