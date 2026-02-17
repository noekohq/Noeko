import { BunFile, S3File, S3Client } from "bun";

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
