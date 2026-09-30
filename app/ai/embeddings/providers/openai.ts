import OpenAI from "openai";
import type { EmbeddingVector, EmbeddingsProvider } from "..";
import { max_embeddable_characters } from "../../../settings";
import type { EmbeddingsConfig } from "../config";
import { toPersistedVector } from "../vectors";

const DEFAULT_MODEL = "text-embedding-3-small";
const BATCH_SIZE = 32;

export default class OpenAIEmbeddingsProvider implements EmbeddingsProvider {
  readonly provider = "openai";
  readonly model: string;
  readonly dimension: number;
  readonly supportsBatch = true;
  readonly maxInputCharacters = max_embeddable_characters;
  private readonly client: OpenAI;

  constructor(config: EmbeddingsConfig) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required when EMBEDDINGS_PROVIDER is openai.");
    }

    this.client = new OpenAI({ apiKey });
    this.model = config.model ?? DEFAULT_MODEL;
    this.dimension = config.dimension;
  }

  async embedContent(content: string): Promise<EmbeddingVector | null> {
    if (!content) {
      throw new Error("Can't embed empty content!");
    }

    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: this.truncate(content),
        dimensions: this.dimension,
        encoding_format: "float",
      });
      const vector = response.data[0]?.embedding;
      if (!vector) {
        throw new Error("OpenAI returned no embedding vector.");
      }
      return toPersistedVector(vector, this.dimension, `${this.provider}:${this.model}`);
    } catch (error) {
      console.error("Error embedding content with OpenAI:", error);
      return null;
    }
  }

  async embedContents(contents: string[]): Promise<(EmbeddingVector | null)[] | null> {
    if (contents.length === 0) {
      return [];
    }

    try {
      const vectors: (EmbeddingVector | null)[] = Array(contents.length).fill(null);
      const nonEmpty = contents
        .map((content, index) => ({ content, index }))
        .filter(({ content }) => content.length > 0);

      for (let start = 0; start < nonEmpty.length; start += BATCH_SIZE) {
        const batch = nonEmpty.slice(start, start + BATCH_SIZE);
        const response = await this.client.embeddings.create({
          model: this.model,
          input: batch.map(({ content }) => this.truncate(content)),
          dimensions: this.dimension,
          encoding_format: "float",
        });

        for (const item of response.data) {
          const originalIndex = batch[item.index]?.index;
          if (originalIndex === undefined) {
            throw new Error(`OpenAI returned an unexpected embedding index: ${item.index}`);
          }
          vectors[originalIndex] = toPersistedVector(
            item.embedding,
            this.dimension,
            `${this.provider}:${this.model}`
          );
        }
      }

      for (const { index } of contents
        .map((content, index) => ({ content, index }))
        .filter(({ content }) => content.length === 0)) {
        vectors[index] = await this.getEmptyEmbeddings();
      }

      return vectors;
    } catch (error) {
      console.error("Error embedding content batch with OpenAI:", error);
      return null;
    }
  }

  async getEmptyEmbeddings(dimension = this.dimension): Promise<EmbeddingVector> {
    return toPersistedVector(Array(dimension).fill(0), dimension, `${this.provider}:empty`);
  }

  async listAvailableModels(): Promise<string[]> {
    try {
      const models: string[] = [];
      for await (const model of this.client.models.list()) {
        if (model.id.startsWith("text-embedding-")) {
          models.push(model.id);
        }
      }
      return models;
    } catch (error) {
      console.error("Error listing OpenAI embedding models:", error);
      return [];
    }
  }

  private truncate(content: string) {
    return content.slice(0, this.maxInputCharacters);
  }
}
