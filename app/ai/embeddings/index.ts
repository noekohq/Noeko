export type EmbeddingVector = number[];

export interface EmbeddingsProvider {
  provider: string;
  model: string;
  dimension: number;
  supportsBatch: boolean;
  maxInputCharacters?: number;
  embedContent(content: string): Promise<EmbeddingVector | null>;
  embedContents(contents: string[]): Promise<(EmbeddingVector | null)[] | null>;
  getEmptyEmbeddings(dimension?: number): Promise<EmbeddingVector>;
  listAvailableModels(): Promise<string[]>;
}
