import { createHash } from "node:crypto";
import type { EmbeddingVector, EmbeddingsProvider } from "..";
import type { EmbeddingsConfig } from "../config";
import { toPersistedVector } from "../vectors";

const DEFAULT_MODEL = "deterministic-sha256";

export default class DeterministicProvider implements EmbeddingsProvider {
  readonly provider = "deterministic";
  readonly model: string;
  readonly dimension: number;
  readonly supportsBatch = true;

  constructor(config: EmbeddingsConfig) {
    this.model = config.model ?? DEFAULT_MODEL;
    this.dimension = config.dimension;
  }

  async embedContent(content: string): Promise<EmbeddingVector | null> {
    if (!content) {
      throw new Error("Can't embed empty content!");
    }

    return this.createVector(content);
  }

  async embedContents(contents: string[]): Promise<(EmbeddingVector | null)[]> {
    return Promise.all(
      contents.map((content) => {
        if (!content) {
          return this.getEmptyEmbeddings();
        }
        return this.embedContent(content);
      })
    );
  }

  async getEmptyEmbeddings(dimension = this.dimension): Promise<EmbeddingVector> {
    return toPersistedVector(Array(dimension).fill(0), dimension, `${this.provider}:empty`);
  }

  async listAvailableModels(): Promise<string[]> {
    return [DEFAULT_MODEL];
  }

  private createVector(content: string): EmbeddingVector {
    const vector: number[] = [];
    let chunk = 0;

    while (vector.length < this.dimension) {
      const digest = createHash("sha256")
        .update(this.model)
        .update(String(chunk))
        .update(content)
        .digest();

      for (const byte of digest) {
        if (vector.length >= this.dimension) {
          break;
        }

        vector.push(byte / 127.5 - 1);
      }
      chunk += 1;
    }

    return toPersistedVector(vector, this.dimension, `${this.provider}:${this.model}`);
  }
}
