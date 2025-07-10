import { GoogleGenAI } from "@google/genai";
import type { EmbeddingsProvider } from "..";
import {
  default_embeddings_dimension,
  default_google_embeddings_model,
} from "../../../settings";

const API_KEY = process.env.GEMINI_API_KEY;
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
const GCP_LOCATION = process.env.GCP_LOCATION || "us-west1";

const { GOOGLE_EMBEDDING_MODEL_NAME } = process.env;

export default class GoogleProvider implements EmbeddingsProvider {
  private client: GoogleGenAI;
  private _model: string;

  constructor() {
    this.client = new GoogleGenAI(
      GCP_PROJECT_ID
        ? {
            project: GCP_PROJECT_ID,
            location: GCP_LOCATION,
          }
        : {
            apiKey: API_KEY,
          },
    );
    this._model =
      GOOGLE_EMBEDDING_MODEL_NAME ?? default_google_embeddings_model;
    this.checkModelAvailability();
  }

  get model() {
    return this._model;
  }

  async checkModelAvailability() {
    const listModels = await this.listAvailableModels();
    const currentModelExists = listModels.includes(this.model);
    if (!currentModelExists) {
      console.error("Current model not available: ", this.model);
      return false;
    }
    return true;
  }

  async listAvailableModels(): Promise<string[]> {
    try {
      const models = await this.client.models.list();
      const modelsFound = models.page;
      const modelStrings = modelsFound.map((model) => {
        return (
          model.name ||
          `Display: ${model.displayName}` ||
          "No information available"
        );
      });
      return modelStrings;
    } catch (error) {
      console.error("Error listing models: ", error);
      return [];
    }
  }

  async embedContent(content: string): Promise<number[] | null> {
    try {
      const response = await this.client.models.embedContent({
        model: this.model,
        contents: [content],
        config: {
          outputDimensionality: default_embeddings_dimension,
        },
      });
      if (!response.embeddings?.length) {
        throw new Error("No embeddings returned from model");
      }
      const result = response.embeddings[0].values;
      if (!result) {
        throw new Error("No embeddings vector provided by model!");
      }
      return result;
    } catch (error) {
      console.error("Error embedding content: ", error);
      return null;
    }
  }

  async embedContents(contents: string[]): Promise<(number[] | null)[] | null> {
    try {
      const response = await this.client.models.embedContent({
        model: this.model,
        contents: [...contents],
        config: {
          outputDimensionality: default_embeddings_dimension,
        },
      });
      if (!response.embeddings?.length) {
        throw new Error("No embeddings returned from model");
      }
      const results = response.embeddings.map((r) => r.values ?? null);
      if (!results) {
        throw new Error("No embeddings provided by model!");
      }
      return results;
    } catch (error) {
      console.error("Error embedding content: ", error);
      return null;
    }
  }

  async getEmptyEmbeddings(
    dimension = default_embeddings_dimension,
  ): Promise<number[]> {
    return Array(dimension).fill(0);
  }
}
