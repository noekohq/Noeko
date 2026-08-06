export type TranscriptionInput = {
  data: Buffer;
  fileName: string;
  mimeType: string;
};

export interface TranscriptionProvider {
  readonly model: string;
  transcribe(input: TranscriptionInput): Promise<string>;
  withModel(model: string): TranscriptionProvider;
}
