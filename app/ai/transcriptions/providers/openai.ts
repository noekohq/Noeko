import OpenAI, { toFile } from "openai";
import { TranscriptionInput, TranscriptionProvider } from "..";

const DEFAULT_MODEL = "gpt-transcribe";

export default class OpenAITranscriptionProvider implements TranscriptionProvider {
  private readonly client: OpenAI;
  private _model: string;

  constructor(model = process.env.TRANSCRIPTION_MODEL || DEFAULT_MODEL) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required when TRANSCRIPTION_PROVIDER is openai.");
    }

    this.client = new OpenAI({
      apiKey,
      timeout: 360_000,
    });
    this._model = model;
  }

  get model() {
    return this._model;
  }

  withModel(model: string) {
    this._model = model;
    return this;
  }

  async transcribe(input: TranscriptionInput): Promise<string> {
    const file = await toFile(input.data, input.fileName, {
      type: input.mimeType,
    });
    const transcription = await this.client.audio.transcriptions.create({
      file,
      model: this.model,
    });
    const text = transcription.text?.trim();
    if (!text) {
      throw new Error("The transcription provider returned an empty transcript.");
    }
    return text;
  }
}
