import { RecordId, StringRecordId } from "surrealdb";
import { ISpyglassSearch } from "./search";
import Spyglass, { IFinding } from "../../services/Spyglass";
import { getDatabase } from "../db";
import { IUserFile, UserFile } from "./userfile";
import { getEmbedder } from "../../ai/embeddings/embeddings";

export interface ISourceable {
  id: string | RecordId;
  owner: string | RecordId;
  content: string;
  name: string;
}

export const Sourceables = ["user_file"];
export type ISourceReference = IUserFile;

export type ISourceVisibility = "private" | "unlisted" | "public";

export type ISource = {
  id: string | RecordId;
  displayName: string;
  content: string;
  visibility: ISourceVisibility;
  embeddings: number[];
  embeddingsUpdatedAt: Date;
  analysis?: ISourceAnalysis;
  references?: StringRecordId | ISourceReference;
  createdAt: Date;
  updatedAt: Date;
};

export type ISourceCreator = Omit<ISource, "id">;

export type ISourceAnalysis = {
  headline: string;
  abstract: string;
  outline: ISourceOutlineItem[];
  findings: IFinding[];
};

export type ISourceOutlineItem = {
  section: string;
  summary: string;
};

export type ISourceOwnership = {
  in: string | RecordId;
  out: string | RecordId;
  createdAt: Date;
};

export type ISourceForUser = {
  in: string | RecordId;
  out: string | RecordId;
  createdAt: Date;
};

export default class Source {
  constructor() {}

  public static async up() {
    const db = await getDatabase();

    if (!db) {
      throw new Error("Couldn't get database while running Source.up");
    }

    const getSourceRecordFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::get_source_record(
        $sourceId: record<source>
      ) {
        LET $source = SELECT
          *
          FROM ONLY $sourceId
          FETCH references;
        RETURN $source;
      }
      `;
    };

    const getSourcesByUserFunction = () => {
      return `
          DEFINE FUNCTION OVERWRITE fn::get_sources_by_user(
            $userId: record<user>
          ) {
            LET $sources = SELECT
              *,
              ->references->(?) as references
              FROM source
              WHERE <-sources<-(user WHERE id = $userId);
            RETURN $sources;
          }
          `;
    };
    await db.query(getSourceRecordFunction());
    await db.query(getSourcesByUserFunction());
  }

  public static async from(
    sourceable: ISourceable,
    visibility: ISource["visibility"],
  ): Promise<ISource | undefined> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get database");
      }
      const result = await db.create<ISource, ISourceCreator>("source", {
        displayName: sourceable.name,
        content: sourceable.content,
        embeddings: await getEmbedder().getEmptyEmbeddings(),
        embeddingsUpdatedAt: new Date(),
        visibility,
        references: new StringRecordId(sourceable.id),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      if (!result) {
        throw new Error("Result is undefined");
      }
      const [source] = result;
      if (!source) {
        throw new Error("Couldn't create source");
      }
      await this.establishOwnership(sourceable.owner, source.id);
      await this.sourceForUser(sourceable.owner, source.id);
      this.loadAnalysis(source.id);
      this.loadEmbeddings(source.id);
      return source;
    } catch (error) {
      console.error("Error creating source from: ", sourceable, error);
      return undefined;
    }
  }

  public static async get(sourceId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get database");
      }
      const source = await db.run<ISource>("fn::get_source_record", [
        new StringRecordId(sourceId),
      ]);
      if (!source) {
        throw new Error("Couldn't get source");
      }
      return source;
    } catch (error) {
      console.error("Error getting source: ", sourceId, error);
      return undefined;
    }
  }

  public static async all(userId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get database");
      }
      const sources = await db.run<ISource[]>("fn::get_sources_by_user", [
        new StringRecordId(userId),
      ]);
      return sources;
    } catch (error) {
      console.error("Error getting sources: ", error);
      return undefined;
    }
  }

  public static async update(
    sourceId: string | RecordId,
    updates: Partial<ISourceCreator>,
  ) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get database");
      }
      const update = await db.merge<ISource, Partial<ISourceCreator>>(
        new StringRecordId(sourceId),
        {
          ...updates,
          updatedAt: new Date(),
        },
      );
      if (!update) {
        throw new Error("Couldn't update source");
      }
      return update;
    } catch (error) {
      console.error("Error updating source: ", sourceId, updates, error);
      return undefined;
    }
  }

  public static async delete(sourceId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get database");
      }
      const deleted = await db.delete<ISource>(new StringRecordId(sourceId));
      if (!deleted) {
        throw new Error("Couldn't delete source");
      }
      return deleted;
    } catch (error) {
      console.error("Error deleting source: ", sourceId, error);
      return undefined;
    }
  }

  public static async establishOwnership(
    userId: string | RecordId,
    sourceId: string | RecordId,
  ) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get database");
      }
      const result = await db.query<[ISourceOwnership]>(
        `RELATE $userId->owns->$sourceId CONTENT { createdAt: $now };`,
        {
          userId: new StringRecordId(userId),
          sourceId: new StringRecordId(sourceId),
          now: new Date(),
        },
      );
      if (!result) {
        throw new Error("Couldn't get results");
      }
      const [relationship] = result;
      if (!relationship) {
        throw new Error("Couldn't create user->owns->source relationship");
      }
      return relationship;
    } catch (error) {
      console.error("Error creating user->owns->source relationship: ", error);
      return undefined;
    }
  }

  public static async sourceForUser(
    userId: string | RecordId,
    sourceId: string | RecordId,
  ) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get database");
      }
      const result = await db.query<[ISourceForUser]>(
        `RELATE $userId->sources->$sourceId CONTENT { createdAt: $now };`,
        {
          userId: new StringRecordId(userId),
          sourceId: new StringRecordId(sourceId),
          now: new Date(),
        },
      );
      if (!result) {
        throw new Error("Couldn't get results");
      }
      const [relationship] = result;
      if (!relationship) {
        throw new Error("Couldn't create user->owns->source relationship");
      }
      return relationship;
    } catch (error) {
      console.error("Error creating user->owns->source relationship: ", error);
      return undefined;
    }
  }

  public static async loadAnalysis(sourceId: string | RecordId) {
    try {
      const analysis = await Spyglass.analyzeSource(sourceId);
      if (!analysis) {
        throw new Error("Couldn't get analysis.");
      }
      const update = await this.update(sourceId, {
        analysis,
      });
      return update;
    } catch (error) {
      console.error("Error getting source analysis: ", sourceId, error);
      return undefined;
    }
  }

  public static async loadEmbeddings(sourceId: string | RecordId) {
    try {
      const source = await this.get(sourceId);
      if (!source) {
        throw new Error("Couldn't load source");
      }
      const embedder = getEmbedder();
      const analysis = source.analysis;
      if (!analysis) {
        throw new Error(
          "Couldn't load embedding vector for source with no analysis",
        );
      }
      const embeddable = `
        ${analysis.headline}
        ---
        ${analysis.abstract}
        `;
      const embedding = await embedder.embedContent(embeddable);
      if (!embedding) {
        throw new Error("No embedding generated");
      }
      const updated = await this.update(source.id, {
        embeddings: embedding,
        embeddingsGeneratedAt: new Date(),
      });
      return updated;
    } catch (error) {
      console.error("Error loading source embeddings: ", sourceId, error);
      return undefined;
    }
  }

  public static isSourceable(thingId: string | RecordId) {
    const tb = thingId.toString().split(":")[0];
    return Sourceables.includes(tb);
  }

  public static async fromSourceable(
    userId: string | RecordId,
    thingId: string | RecordId,
    visibility: ISource["visibility"],
  ) {
    try {
      if (!this.isSourceable(thingId)) {
        throw new Error("Tried to source from unsourceable entity");
      }
      const normalized = thingId.toString().split(":")[0];
      switch (normalized) {
        case "user_file":
          const file = await UserFile.get(thingId);
          if (!file) {
            throw new Error("Couldn't get the user file");
          }
          const textContent = await UserFile.getTextContent(file.id);
          if (!textContent) {
            throw new Error("Couldn't get text content of file");
          }
          const source = await this.from(
            {
              id: file.id,
              name: file?.originalFileName || "Untitled File",
              content: textContent,
              owner: userId,
            },
            visibility,
          );
          return source;
        default:
          throw new Error("No sourcing method for provided record");
      }
    } catch (error) {
      console.error("Error creating source from sourceable: ", thingId, error);
      return undefined;
    }
  }
}
