export interface EmbeddingsProvider {
  model: string;
  embedContent(content: string): Promise<number[] | null>;
  embedContents(contents: string[]): Promise<(number[] | null)[] | null>;
  getEmptyEmbeddings(dimension?: number): Promise<number[]>;
  listAvailableModels(): Promise<string[]>;
}
