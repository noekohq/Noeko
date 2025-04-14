import { BunFile, s3, S3File } from "bun";

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
    | Response
    | BunFile
    | S3File
    | Blob
    | File,
): Promise<{ written: number; completed: boolean }> => {
  try {
    const s3File = s3.file(path);
    console.log("Uploading file to S3...", s3File.name);
    const totalBytes = s3File.size;
    // const written = await s3File.write(file);
    await Bun.sleep(1000);
    const written = 1000; // Simulated for now
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
