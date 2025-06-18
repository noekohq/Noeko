import { RecordId, StringRecordId } from "surrealdb";
import { v4 as uuidv4 } from "uuid";
import path from "node:path";
import { User } from "./user";
import {
  deleteFromS3,
  downloadLinkS3,
  getStreamS3,
  writeToS3,
} from "../../utils/aws/s3";
import { getDatabase } from "../db";
import { Response } from "express";

export type IUserFile = {
  id: RecordId;
  s3key: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
  updatedAt: Date;
};

export type IUserFileForm = Omit<IUserFile, "id" | "createdAt" | "updatedAt">;

export type IUserFileUserOwnership = {
  id: RecordId;
  in: string;
  out: string;
};

const sanitizeFilename = (filename: string): string => {
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return sanitized.substring(0, 100);
};

const constructS3Key = (userId: string, fileName: string) => {
  const uniqueId = uuidv4();
  const fileExtension = path.extname(fileName);
  const baseName = path.basename(fileName, fileExtension);
  const sanitizedBase = sanitizeFilename(baseName);
  return `user_data/${userId}/${uniqueId}_${sanitizedBase}${fileExtension}`;
};

export class UserFile {
  constructor() {}

  static async up() {
    const getUserFilesFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::user_files(
        $userId: string,
      ) {
        LET $userFiles = SELECT ->owns->user_file as userFiles FROM ONLY <record> $userId FETCH userFiles;
        RETURN $userFiles;
      }
      `;
    };

    const db = await getDatabase();
    db?.query(getUserFilesFunction());
  }

  static async create(userId: string | RecordId, file: File) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database not initialized");
      }
      const userExists = await User.get(userId);
      if (!userExists) {
        throw new Error("User not found");
      }
      const key = constructS3Key(userExists.id.toString(), file.name);
      const uploaded = await UserFile.upload(key, file);
      if (!uploaded) {
        throw new Error("Failed to upload file");
      }
      const { completed, written } = uploaded;
      const result = await db.create<
        IUserFile,
        IUserFileForm & {
          createdAt: Date;
          updatedAt: Date;
        }
      >("user_file", {
        s3key: key,
        originalFileName: file.name,
        sizeBytes: written,
        mimeType: file.type,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      if (!result) {
        throw new Error("Failed to create file record");
      }
      const [userFile] = result;
      await UserFile.connectToUser(userFile.id, userExists.id);
      return userFile;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  static async upload(path: string, file: File) {
    try {
      const { completed, written } = await writeToS3(path, file);
      return { completed, written };
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  static async connectToUser(
    userFileId: string | RecordId,
    userId: string | RecordId,
  ) {
    try {
      const db = await getDatabase();
      const result = await db?.query<
        [IUserFileUserOwnership & { id: RecordId }]
      >(`RELATE $fromId -> owns -> $toId SET createdAt = $now;`, {
        fromId: new StringRecordId(userId),
        toId: new StringRecordId(userFileId),
        now: new Date(),
      });
      if (!result) {
        throw Error(
          `No ownership created for user file "${userFileId}" and user "${userId}".`,
        );
      }
      const [ownership] = result;
      return ownership;
    } catch (err) {
      console.error(
        `Error during connectToUser for user file "${userFileId}":`,
        err,
      );
      return undefined;
    }
  }

  static async getUserFiles(userId: string | RecordId) {
    try {
      const db = await getDatabase();
      const result = await db?.run<IUserFile[]>("fn::get_user_files", [userId]);
      if (!result) {
        throw Error(`No user files found for user "${userId}".`);
      }
      const userFiles = result;
      return userFiles;
    } catch (err) {
      console.error(`Error during getUserFiles for user "${userId}":`, err);
      return undefined;
    }
  }

  static async get(userFileId: string | RecordId): Promise<IUserFile> {
    try {
      const db = await getDatabase();
      const result = await db?.select<IUserFile>(
        new StringRecordId(userFileId),
      );
      if (!result) {
        throw Error(`No user file found for id "${userFileId}".`);
      }
      return result;
    } catch (err) {
      console.error(`Error during getUserFile for id "${userFileId}":`, err);
      return undefined;
    }
  }

  static async getDownloadLink(userFileId: string | RecordId) {
    try {
      const file = await UserFile.get(userFileId);
      if (!file) {
        throw Error(`No user file found for id "${userFileId}".`);
      }
      const url = downloadLinkS3(file.s3key);
      return url;
    } catch (err) {
      console.error(
        `Error during getDownloadLink for id "${userFileId}":`,
        err,
      );
      return undefined;
    }
  }

  static async streamToResponse(
    userFileId: string | RecordId,
    response: Response,
  ) {
    try {
      const file = await UserFile.get(userFileId);
      if (!file) {
        throw Error(`No user file found for id "${userFileId}".`);
      }
      response.setHeader("Content-Type", file.mimeType);
      const stream = getStreamS3(file.s3key);
      for await (const chunk of stream as unknown as Buffer[]) {
        response.write(chunk);
      }
      response.end();
    } catch (error) {
      response.status(500).send({
        message: "Internal Server Error",
      });
      return undefined;
    }
  }

  static async checkUserOwnership(
    userFileId: string | RecordId,
    userId: string | RecordId,
  ) {
    try {
      const db = await getDatabase();
      const result = await db?.query<[number]>( // Expecting an array with one object: [{ count: number }]
        `count(SELECT id FROM owns WHERE in = $userId AND out = $userFileId);`,
        {
          userId: new StringRecordId(userId),
          userFileId: new StringRecordId(userFileId),
        },
      );

      if (result && result[0] && result[0] > 0) {
        return true;
      }
      return false;
    } catch (err) {
      console.error(
        `Error during checkUserOwnership for user file "${userFileId}":`,
        err,
      );
      return false;
    }
  }

  static async delete(userFileId: string | RecordId) {
    try {
      const db = await getDatabase();
      const found = await UserFile.get(userFileId);
      if (!found) {
        throw Error(`No user file found for id "${userFileId}".`);
      }
      const deleted = await deleteFromS3(found.s3key);
      if (!deleted) {
        throw Error(`Error during delete for id "${userFileId}".`);
      }
      const result = await db?.delete(new StringRecordId(userFileId));
      if (!result) {
        throw Error(`No user file found for id "${userFileId}".`);
      }
      return result;
    } catch (err) {
      console.error(`Error during delete for id "${userFileId}":`, err);
      return undefined;
    }
  }
}
