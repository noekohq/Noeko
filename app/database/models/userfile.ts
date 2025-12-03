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
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import Source, { ISource } from "./source";

export type IUserFile = {
  id: RecordId;
  s3key: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  source?: ISource;
  createdAt: Date;
  updatedAt: Date;
};

export type ISourceableMimeType = "application/pdf";
export const SourceableMimeTypes = ["application/pdf"];

export type IUserFileForm = Omit<IUserFile, "id" | "createdAt" | "updatedAt">;

export type IUserFileUserOwnership = {
  id: RecordId;
  in: string;
  out: string;
};

export type IConnectableEmbedRelationship = {
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
      DEFINE FUNCTION OVERWRITE fn::get_user_files(
        $userId: string,
      ) {
        LET $userFiles =
          SELECT
            *
          FROM user_file
          WHERE <-owns<-(user WHERE id = <record> $userId)
          ORDER BY updatedAt DESC;
        RETURN $userFiles;
      }
      `;
    };

    const getUserFileFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::get_user_file_record(
        $userFileId: record<user_file>
      ) {
        LET $userFile = SELECT
            *,
            (SELECT * FROM source WHERE references = $userFileId)[0] as source
          FROM ONLY $userFileId;
        RETURN $userFile;
      }
      `;
    };

    const defineEmbeddingIndex = () => {
      return `
        -- Ensure a file can only be embedded in an idea ONCE
        DEFINE INDEX IF NOT EXISTS idx_unique_embedding
        ON TABLE embedded_within
        COLUMNS in, out UNIQUE;
      `;
    };

    const db = await getDatabase();
    await db?.query(defineEmbeddingIndex());
    await db?.query(getUserFilesFunction());
    await db?.query(getUserFileFunction());
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

  static async isEmbeddedInConnectable(
    userFileId: string | RecordId,
    connectableId: string | RecordId,
  ): Promise<IConnectableEmbedRelationship | undefined> {
    try {
      const db = await getDatabase();
      const result = await db?.query<[IConnectableEmbedRelationship[]]>(
        `SELECT * FROM embedded_within WHERE in = $fromId AND out = $toId LIMIT 1;`,
        {
          fromId: new StringRecordId(userFileId),
          toId: new StringRecordId(connectableId),
        },
      );

      if (!result || !result[0]) {
        return undefined;
      }
      const present = result[0][0];

      return present;
    } catch (err) {
      console.error(
        `Error during isEmbeddedInConnectable for user file "${userFileId}":`,
        err,
      );
      return undefined;
    }
  }

  static async embedInConnectable(
    userFileId: string | RecordId,
    connectableId: string | RecordId,
  ) {
    try {
      const existingRelationship = await this.isEmbeddedInConnectable(
        userFileId,
        connectableId,
      );
      if (existingRelationship) {
        return existingRelationship;
      }

      const db = await getDatabase();
      const result = await db?.query<[IConnectableEmbedRelationship]>(
        `RELATE $fromId->embedded_within->$toId SET createdAt = $now;`,
        {
          fromId: new StringRecordId(userFileId),
          toId: new StringRecordId(connectableId),
          now: new Date(),
        },
      );
      if (!result) {
        throw Error(
          `No embedded relationship created for user file "${userFileId}" and connectable "${connectableId}".`,
        );
      }
      const [ownership] = result;
      return ownership;
    } catch (err) {
      console.error(
        `Error during embedInConnectable for user file "${userFileId}":`,
        err,
      );
      return undefined;
    }
  }

  static async unembedFromConnectable(
    userFileId: string | RecordId,
    connectableId: string | RecordId,
  ) {
    try {
      const existingRelationship = await this.isEmbeddedInConnectable(
        userFileId,
        connectableId,
      );
      if (!existingRelationship) {
        return undefined;
      }

      const db = await getDatabase();
      const result = await db?.query<IConnectableEmbedRelationship[]>(
        `DELETE embedded_within WHERE in = $fromId AND out = $toId;`,
        {
          fromId: new StringRecordId(userFileId),
          toId: new StringRecordId(connectableId),
        },
      );
      if (!result) {
        throw Error(
          `Failed to remove embedded relationship for user file "${userFileId}" and connectable "${connectableId}".`,
        );
      }
      const [ownership] = result;
      return ownership;
    } catch (err) {
      console.error(
        `Error during unembedInConnectable for user file "${userFileId}":`,
        err,
      );
      return undefined;
    }
  }

  static async ensureEmbedded(
    connectableId: string | RecordId,
    userFileIds: (string | RecordId)[],
  ) {
    try {
      if (!userFileIds || userFileIds.length === 0) {
        return;
      }

      const db = await getDatabase();
      if (!db) {
        return false;
      }

      const formattedFileIds = userFileIds.map((id) => new StringRecordId(id));
      const formattedConnectableId = new StringRecordId(connectableId);

      const existingResult = await db.query<[{ in: RecordId }[]]>(
        `SELECT in FROM embedded_within WHERE in IN $fileIds AND out = $target;`,
        {
          fileIds: formattedFileIds,
          target: formattedConnectableId,
        },
      );

      if (!existingResult) {
        throw new Error("Failed to query existing embedded relationships.");
      }

      const existingRelations = existingResult[0] || [];
      const existingFileIds = new Set(
        existingRelations.map((item) => item.in.toString()),
      );

      const missingFileIds = formattedFileIds.filter(
        (id) => !existingFileIds.has(id.toString()),
      );

      if (missingFileIds.length > 0) {
        await db.query(
          `
          FOR $fileId IN $missingFileIds {
            RELATE $fileId->embedded_within->$target SET createdAt = time::now();
          };
          `,
          {
            missingFileIds: missingFileIds,
            target: formattedConnectableId,
          },
        );
      }

      return true;
    } catch (err) {
      console.error(
        `Error during ensureEmbedded for connectable "${connectableId}":`,
        err,
      );
      return false;
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

  static async get(
    userFileId: string | RecordId,
  ): Promise<IUserFile | undefined> {
    try {
      const db = await getDatabase();
      const result = await db?.run<IUserFile>("fn::get_user_file_record", [
        new StringRecordId(userFileId),
      ]);
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
      const source = found.source;
      if (source) {
        await Source.delete(source.id.toString());
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

  static async getTextContent(
    userFileId: string | RecordId,
  ): Promise<string | undefined> {
    try {
      const file = await this.get(userFileId);
      if (!file) {
        throw new Error("Error getting text content of the file");
      }
      const allowedTypes = [...SourceableMimeTypes];
      if (!allowedTypes.includes(file.mimeType)) {
        throw new Error(
          "Couldn't get text content of file with unsupported mimetype",
        );
      }

      const stream = getStreamS3(file.s3key);
      if (!stream) {
        throw new Error("Couldn't get s3 stream");
      }
      const chunks: Buffer[] = [];
      for await (const chunk of stream as unknown as Buffer[]) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      const uint8Array = new Uint8Array(buffer);

      switch (file.mimeType) {
        case "application/pdf":
          const doc = await pdfjs.getDocument(uint8Array).promise;
          const pageTexts: string[] = [];

          for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item) => ("str" in item ? item.str : ""))
              .join(" ");
            pageTexts.push(pageText);
          }

          return pageTexts.join("\n\n");
        default:
          throw new Error(
            "Reached fallthrough case trying to get text of file: " + file.id,
          );
      }
    } catch (error) {
      throw error;
    }
  }
}
