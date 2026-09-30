export const AUDIO_MIME_TYPES = [
  "audio/flac",
  "audio/mp3",
  "audio/mp4",
  "audio/mpeg",
  "audio/m4a",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
  "audio/x-wav",
] as const;

export type IAudioMimeType = (typeof AUDIO_MIME_TYPES)[number];

export const IMAGE_MIME_TYPES = [
  "image/avif",
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
] as const;

export type IImageMimeType = (typeof IMAGE_MIME_TYPES)[number];

export const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/ogg",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
] as const;

export type IVideoMimeType = (typeof VIDEO_MIME_TYPES)[number];

export const TRANSCRIBABLE_VIDEO_MIME_TYPES = ["video/mp4", "video/webm"] as const;

export const TEXT_MIME_TYPES = [
  "application/javascript",
  "application/json",
  "application/sql",
  "application/typescript",
  "application/x-yaml",
  "application/xml",
  "application/yaml",
  "text/css",
  "text/csv",
  "text/html",
  "text/javascript",
  "text/markdown",
  "text/plain",
  "text/tab-separated-values",
  "text/typescript",
  "text/x-c",
  "text/x-c++src",
  "text/x-java-source",
  "text/x-markdown",
  "text/x-python",
  "text/x-rust",
  "text/x-yaml",
  "text/xml",
  "text/yaml",
] as const;

export type ITextMimeType = (typeof TEXT_MIME_TYPES)[number];

export const MARKDOWN_MIME_TYPES = ["text/markdown", "text/x-markdown"] as const;

export const SOURCEABLE_MIME_TYPES = [
  "application/pdf",
  ...AUDIO_MIME_TYPES,
  ...TRANSCRIBABLE_VIDEO_MIME_TYPES,
  ...TEXT_MIME_TYPES,
] as const;

export type ISourceableMimeType = (typeof SOURCEABLE_MIME_TYPES)[number];

export const SUPPORTED_FILE_MIME_TYPES = [
  "application/pdf",
  ...AUDIO_MIME_TYPES,
  ...VIDEO_MIME_TYPES,
  ...TEXT_MIME_TYPES,
  ...IMAGE_MIME_TYPES,
] as const;

export const isAudioMimeType = (mimeType: string): mimeType is IAudioMimeType =>
  AUDIO_MIME_TYPES.includes(mimeType as IAudioMimeType);

export const isImageMimeType = (mimeType: string): mimeType is IImageMimeType =>
  IMAGE_MIME_TYPES.includes(mimeType as IImageMimeType);

export const isVideoMimeType = (mimeType: string): mimeType is IVideoMimeType =>
  VIDEO_MIME_TYPES.includes(mimeType as IVideoMimeType);

export const isTextMimeType = (mimeType: string): mimeType is ITextMimeType =>
  TEXT_MIME_TYPES.includes(mimeType as ITextMimeType);

export const isMarkdownMimeType = (mimeType: string) =>
  MARKDOWN_MIME_TYPES.includes(mimeType as (typeof MARKDOWN_MIME_TYPES)[number]);

export const isTranscribableMimeType = (mimeType: string) =>
  isAudioMimeType(mimeType) ||
  TRANSCRIBABLE_VIDEO_MIME_TYPES.includes(
    mimeType as (typeof TRANSCRIBABLE_VIDEO_MIME_TYPES)[number]
  );

export const isSourceableMimeType = (mimeType: string): mimeType is ISourceableMimeType =>
  SOURCEABLE_MIME_TYPES.includes(mimeType as ISourceableMimeType);

export const getFileKindLabel = (mimeType: string) => {
  if (isAudioMimeType(mimeType)) return "Voice recording";
  if (isVideoMimeType(mimeType)) return "Video";
  if (isImageMimeType(mimeType)) return "Image";
  if (isMarkdownMimeType(mimeType)) return "Markdown";
  if (isTextMimeType(mimeType)) return "Text document";
  if (mimeType === "application/pdf") return "PDF document";
  return "File";
};
