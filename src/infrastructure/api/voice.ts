import { api } from "./client";

export type VoiceProcessingMode = "clean" | "summarize" | "structure";

export type TranscriptionResult = {
  transcript: string;
  provider: string;
  model: string;
};

export const transcribeVoiceRecording = async (file: File): Promise<TranscriptionResult> => {
  const formData = new FormData();
  formData.append("audio", file);
  const response = await api.post("/voice/transcribe", formData);
  return response.data.data as TranscriptionResult;
};

export const processVoiceTranscript = async (
  transcript: string,
  mode: VoiceProcessingMode
): Promise<string> => {
  const response = await api.post("/voice/process", { transcript, mode });
  return response.data.data.transcript as string;
};
