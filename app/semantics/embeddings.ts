import { GenerativeModel, GoogleGenerativeAI } from "@google/generative-ai";

const apiKeyName = "GEMINI_API_KEY";

const API_KEY = process.env[apiKeyName];

if (!API_KEY) {
  throw new Error(`${apiKeyName} is not defined. Is it set in ".env"?`);
}

export type EmbeddingsModelConfig = {
  apiKey: string;
};

export type EmbeddingsModelResponse = {
  embeddings: number[];
};

export class EmbeddingsModel {
  apiKey: string;
  private client: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor(config: EmbeddingsModelConfig) {
    this.apiKey = config.apiKey;
    this.client = new GoogleGenerativeAI(this.apiKey);
    this.model = this.client.getGenerativeModel({
      model: "text-embeddings-005",
    });
  }

  async embedContent(content: string): Promise<EmbeddingsModelResponse> {
    const response = await this.model.embedContent(content);
    return {
      embeddings: response.embedding.values,
    };
  }
}

export class Embeddings {
  private model: EmbeddingsModel;

  constructor() {
    if (!API_KEY) {
      throw new Error(
        `${apiKeyName} is not defined. Cannot initialize EmbeddingsModel.`,
      );
    }
    this.model = new EmbeddingsModel({ apiKey: API_KEY });
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    try {
      const response = await this.model.embedContent(text);
      return response.embeddings;
    } catch (error) {
      console.error("Error generating embeddings:", error);
      throw error;
    }
  }
}
