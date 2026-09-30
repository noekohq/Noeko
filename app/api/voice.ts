import { Request, Router } from "express";
import Busboy from "busboy";
import { checkToken, disallowDisabled } from "../middleware/auth";
import { getTranscriptionProvider } from "../ai/transcriptions/transcription";
import { getLM } from "../ai/lms/lm";

const router = Router();

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const allowedAudioMimeTypes = new Set([
  "audio/flac",
  "audio/mp3",
  "audio/mp4",
  "audio/mpeg",
  "audio/mpeg3",
  "audio/mpga",
  "audio/m4a",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
  "audio/x-wav",
]);

type AudioUpload = {
  data: Buffer;
  fileName: string;
  mimeType: string;
};

class AudioUploadError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

const normalizeMimeType = (mimeType: string) => mimeType.toLowerCase().split(";", 1)[0].trim();

const parseAudioUpload = (req: Request) => {
  return new Promise<AudioUpload>((resolve, reject) => {
    let busboy: ReturnType<typeof Busboy>;
    try {
      busboy = Busboy({
        headers: req.headers,
        limits: { files: 1, fileSize: MAX_AUDIO_BYTES },
      });
    } catch {
      reject(new AudioUploadError("A multipart audio upload is required.", 400));
      return;
    }

    let uploadPromise: Promise<AudioUpload> | undefined;

    busboy.on("file", (fieldName, stream, info) => {
      if (fieldName !== "audio") {
        stream.resume();
        return;
      }

      const mimeType = normalizeMimeType(info.mimeType);
      uploadPromise = new Promise<AudioUpload>((resolveUpload, rejectUpload) => {
        if (!allowedAudioMimeTypes.has(mimeType)) {
          stream.resume();
          rejectUpload(new AudioUploadError(`Unsupported audio type: ${mimeType}.`, 400));
          return;
        }

        const chunks: Buffer[] = [];
        let truncated = false;
        stream.on("limit", () => {
          truncated = true;
        });
        stream.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });
        stream.on("error", rejectUpload);
        stream.on("end", () => {
          if (truncated) {
            rejectUpload(new AudioUploadError("Audio recordings cannot exceed 25 MB.", 413));
            return;
          }
          resolveUpload({
            data: Buffer.concat(chunks),
            fileName: info.filename || "voice-capture.webm",
            mimeType,
          });
        });
      });
    });

    busboy.on("error", reject);
    busboy.on("finish", async () => {
      if (!uploadPromise) {
        reject(new AudioUploadError("No audio recording was uploaded.", 400));
        return;
      }
      try {
        resolve(await uploadPromise);
      } catch (error) {
        reject(error);
      }
    });

    req.pipe(busboy);
  });
};

router.post("/transcribe", checkToken, disallowDisabled, async (req, res) => {
  try {
    const audio = await parseAudioUpload(req);
    const provider = getTranscriptionProvider();
    const transcript = await provider.transcribe(audio);
    res.send({
      message: "Audio transcribed successfully.",
      data: {
        transcript,
        provider: process.env.TRANSCRIPTION_PROVIDER || "openai",
        model: provider.model,
      },
    });
  } catch (error) {
    console.error("Voice transcription failed:", error);
    const status = error instanceof AudioUploadError ? error.status : 500;
    const message =
      error instanceof AudioUploadError ? error.message : "The recording could not be transcribed.";
    res.status(status).send({ error: "Transcription failed", message });
  }
});

const processingInstructions = {
  clean:
    "Correct transcription mistakes, remove false starts and filler words, and improve punctuation. Preserve the speaker's meaning, details, and tone. Do not add new information.",
  summarize:
    "Create a concise summary that preserves the important facts, decisions, and follow-up items. Do not add information that is not present in the transcript.",
  structure:
    "Organize the transcript into clear Markdown headings, paragraphs, and lists where useful. Preserve all meaningful details and do not add new information.",
} as const;

type ProcessingMode = keyof typeof processingInstructions;

const isProcessingMode = (mode: unknown): mode is ProcessingMode =>
  typeof mode === "string" && mode in processingInstructions;

router.post("/process", checkToken, disallowDisabled, async (req, res) => {
  try {
    const { transcript, mode } = req.body as { transcript?: unknown; mode?: unknown };
    if (typeof transcript !== "string" || !transcript.trim()) {
      res.status(400).send({ message: "A transcript is required." });
      return;
    }
    if (!isProcessingMode(mode)) {
      res.status(400).send({ message: "Mode must be clean, summarize, or structure." });
      return;
    }

    const prompt = `${processingInstructions[mode]}

Return only the processed transcript, without commentary or a preamble.

<transcript>
${transcript.trim()}
</transcript>`;
    const processed = await getLM().withModel("simple").generate(prompt);
    if (!processed?.trim()) {
      res.status(502).send({ message: "The language model returned an empty result." });
      return;
    }
    res.send({
      message: "Transcript processed successfully.",
      data: { transcript: processed.trim(), mode },
    });
  } catch (error) {
    console.error("Voice transcript processing failed:", error);
    res.status(500).send({ message: "The transcript could not be processed." });
  }
});

export default router;
