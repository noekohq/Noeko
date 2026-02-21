import { BunFile, S3File, S3Client } from "bun";
import { Readable } from "node:stream";
import { nodeToWeb } from "../streams";

const { S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION, S3_BUCKET, S3_ENDPOINT } = process.env;

if (!S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !S3_REGION || !S3_BUCKET) {
  throw new Error(
    "Missing S3 credentials. Required: S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION, S3_BUCKET"
  );
}

const client = new S3Client({
  accessKeyId: S3_ACCESS_KEY_ID,
  secretAccessKey: S3_SECRET_ACCESS_KEY,
  endpoint: S3_ENDPOINT,
  bucket: S3_BUCKET,
});

export const writeToS3 = async (
  path: string,
  file:
    | string
    | ArrayBufferView
    | ArrayBuffer
    | SharedArrayBuffer
    | Request
    | BunFile
    | S3File
    | Blob
    | File
): Promise<{ written: number; completed: boolean }> => {
  try {
    const s3File = client.file(path);
    const totalBytes = s3File.size;
    const written = await s3File.write(file as any);
    const completed = totalBytes === written;
    return {
      written,
      completed,
    };
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

export const deleteFromS3 = async (path: string): Promise<boolean> => {
  try {
    const s3File = client.file(path);
    await s3File.delete();
    return true;
  } catch (error) {
    console.error("Error deleting file:", error);
    return false;
  }
};

export const existsS3 = async (path: string): Promise<boolean> => {
  try {
    const s3File = client.file(path);
    return await s3File.exists();
  } catch (error) {
    console.error("Error checking file existence:", error);
    throw error;
  }
};

export const downloadLinkS3 = async (path: string): Promise<string> => {
  try {
    const url = client.presign(path, {
      expiresIn: 3600,
      method: "GET",
    });
    return url;
  } catch (error) {
    console.error("Error generating download link:", error);
    throw error;
  }
};

export const getStreamS3 = (path: string) => {
  try {
    const s3file = client.file(path);
    const stream = s3file.stream();
    return stream;
  } catch (error) {
    console.error("Error streaming image: ", error);
    throw error;
  }
};

type StreamableSource =
  | Readable
  | ReadableStream
  | Blob
  | File
  | Response
  | string
  | ArrayBuffer
  | Uint8Array;

export const streamToS3 = async (
  path: string,
  stream: StreamableSource,
  options?: { type?: string; partSize?: number; retry?: number }
): Promise<{ written: number; completed: boolean }> => {
  try {
    const s3File = client.file(path);

    // CASE 1: Stream (Unknown Length) -> Use Multipart Writer
    if (stream instanceof Readable || stream instanceof ReadableStream) {
      const writer = s3File.writer({
        type: options?.type,
        partSize: options?.partSize ?? 5 * 1024 * 1024, // Default 5MB chunks
        retry: options?.retry,
      });

      let written = 0;

      // 'for await' works on both Node.js Readables and Web ReadableStreams
      // @ts-ignore - TS might complain about ReadableStream iteration depending on lib target
      for await (const chunk of stream) {
        writer.write(chunk);
        written += (chunk as any).length || chunk.byteLength || 0;
      }

      // Finalize the multipart upload
      await writer.end();

      return {
        written,
        completed: written > 0,
      };
    }

    // CASE 2: Static Data (Blob, String, ArrayBuffer) -> Use Standard Write
    // These have known lengths, so the standard PUT .write() works fine.
    const written = await s3File.write(stream as any, {
      type: options?.type,
    });

    return {
      written,
      completed: written > 0,
    };
  } catch (error) {
    console.error("Streaming upload to S3 failed:", error);
    throw error;
  }
};
