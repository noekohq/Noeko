import { GoogleGenAI } from "@google/genai";
import type { EmbeddingsProvider } from "..";
import {
  default_embeddings_dimension,
  default_google_embeddings_model,
} from "../../../settings";
import { getLevenshteinDistance } from "../../../utils/strings";
import { sleep } from "bun";

const API_KEY = process.env.GEMINI_API_KEY;
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
const GCP_LOCATION = process.env.GCP_LOCATION || "us-west1";

const { GOOGLE_EMBEDDING_MODEL_NAME } = process.env;

export default class GoogleProvider implements EmbeddingsProvider {
  private client: GoogleGenAI;
  private _model: string;
  private lastRequestTimestamp: number = 0;
  private readonly minIntervalMs: number;
  private readonly rpm: number;

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
    this._model =
      GOOGLE_EMBEDDING_MODEL_NAME ?? default_google_embeddings_model;
    const rpmEnv = process.env.EMBEDDINGS_RPM_LIMIT || "60"; // Default to 60 RPM
    this.rpm = parseInt(rpmEnv, 10);
    if (isNaN(this.rpm) || this.rpm <= 0) {
      console.warn(
        `[VertexAIEmbeddingProvider] Invalid EMBEDDINGS_RPM_LIMIT value "${rpmEnv}", defaulting to 60 RPM.`,
      );
      this.rpm = 60;
    }
    this.minIntervalMs = (60 * 1000) / this.rpm;
  }

  get model() {
    return this._model;
  }

  async checkModelAvailability() {
    // Note: there seems to be an inconsistency between what is returned from this list and what is actually available :/
    const listModels = await this.listAvailableModels();
    const currentModelExists = listModels.includes(this.model);
    if (!currentModelExists) {
      console.error("Current model not available: ", this.model);
      console.info(
        "Available models: ",
        listModels
          .sort((a, b) => {
            const distA = getLevenshteinDistance(a, this.model);
            const distB = getLevenshteinDistance(b, this.model);
            return distA - distB;
          })
          .join(", "),
      );
      return false;
    }
    return true;
  }

  async listAvailableModels(): Promise<string[]> {
    try {
      const models = await this.client.models.list({
        config: {
          pageSize: 100,
        },
      });
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
      const startTime = Date.now();
      const response = await this.client.models.embedContent({
        model: this.model,
        contents: [content],
        config: {
          outputDimensionality: default_embeddings_dimension,
        },
      });
      const endTime = Date.now();
      console.log(
        `Embedding content took ${(endTime - startTime).toFixed(2)}ms`,
      );
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
      if (!contents || contents.length === 0) {
        console.info(
          `[${this.constructor.name}] embedContents: No texts provided, returning empty array.`,
        );
        return [];
      }

      console.info(
        `[${this.constructor.name}] embedContents: Embedding ${contents.length} texts sequentially with throttling (Target RPM: ${this.rpm}).`,
      );
      const allEmbeddings: number[][] = [];

      for (let i = 0; i < contents.length; i++) {
        const content = contents[i];
        if (content.length === 0) {
          allEmbeddings.push(await this.getEmptyEmbeddings());
          continue;
        }
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTimestamp;

        if (
          this.lastRequestTimestamp !== 0 &&
          timeSinceLastRequest < this.minIntervalMs
        ) {
          const delayNeeded = this.minIntervalMs - timeSinceLastRequest;
          console.info(
            `[${this.constructor.name}] Throttling: waiting ${delayNeeded.toFixed(0)}ms before embedding text ${i + 1}/${contents.length}.`,
          );
          await sleep(delayNeeded);
        }

        this.lastRequestTimestamp = Date.now();

        const displayText =
          content.length > 70 ? `${content.substring(0, 67)}...` : content;
        console.info(
          `[${this.constructor.name}] Embedding text ${i + 1}/${contents.length}: "${displayText}"`,
        );

        try {
          const embedding = await this.embedContent(content);
          if (!embedding) {
            allEmbeddings.push([...(await this.getEmptyEmbeddings())]);
            continue;
          }
          allEmbeddings.push(embedding);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(
            `[${this.constructor.name}] Error embedding text ${i + 1} ("${displayText}"): ${errorMessage}`,
          );
        }
      }

      console.info(
        `[${this.constructor.name}] embedContents: Successfully processed ${allEmbeddings.length} texts sequentially.`,
      );
      return allEmbeddings;
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
