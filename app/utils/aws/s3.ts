import { BunFile, s3, S3File } from "bun";
import { Response } from "express";
import { ReadableStream } from "node:stream/web";

const { S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION, S3_BUCKET } =
  process.env;

if (!S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !S3_REGION || !S3_BUCKET) {
  throw new Error(
    "Missing AWS S3 credentials. Required: S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION, S3_BUCKET",
  );
}

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
    | File,
): Promise<{ written: number; completed: boolean }> => {
  try {
    const s3File = s3.file(path);
    const totalBytes = s3File.size;
    const written = await s3File.write(file);
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
    const s3File = s3.file(path);
    await s3File.delete();
    return true;
  } catch (error) {
    console.error("Error deleting file:", error);
    return false;
  }
};

export const existsS3 = async (path: string): Promise<boolean> => {
  try {
    const s3File = s3.file(path);
    return await s3File.exists();
  } catch (error) {
    console.error("Error checking file existence:", error);
    throw error;
  }
};

export const downloadLinkS3 = async (path: string): Promise<string> => {
  try {
    const url = s3.presign(path, {
      expiresIn: 3600,
      method: "GET",
    });
    return url;
  } catch (error) {
    console.error("Error generating download link:", error);
    throw error;
  }
};

export const getStreamS3 = (path: string): globalThis.ReadableStream => {
  try {
    const s3file = s3.file(path);
    const stream = s3file.stream();
    return stream;
  } catch (error) {
    console.error("Error streaming image: ", error);
    throw error;
  }
};
