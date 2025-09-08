import { RecordId, StringRecordId } from "surrealdb";
import { ISource } from "./source";
import { getDatabase } from "../db";
import { getEmbedder } from "../../ai/embeddings/embeddings";
import {
  PdfHighlightAnnoObject,
  Rect,
  PdfAnnotationSubtype,
} from "@embedpdf/models";

type IExcerptReference = ISource;

export type IExcerptable = {
  id: string | RecordId;
  owner: string | RecordId;
};

export type IPDFMetadata = {
  pageIndex: number;
  data: {
    pageIndex: number;
    type: PdfAnnotationSubtype;
    rect: Rect;
    segmentRects: Rect[];
  };
};

export type IExcerpt = {
  id: string | RecordId;
  sourceText: string;
  note: string;
  embeddings: number[];
  embeddingsUpdatedAt: Date;
  references?: StringRecordId | IExcerptReference;
  pdfMetadata?: IPDFMetadata;
  createdAt: Date;
  updatedAt: Date;
};

export type IExcerptCreator = Omit<IExcerpt, "id">;
export type IExcerptForm = Omit<
  IExcerptCreator,
  | "embeddings"
  | "embeddingsUpdatedAt"
  | "createdAt"
  | "updatedAt"
  | "references"
>;

export type IExcerptOwnership = {
  in: string | RecordId;
  out: string | RecordId;
  createdAt: Date;
};

export type IExcerptForUser = {
  in: string | RecordId;
  out: string | RecordId;
  createdAt: Date;
};

export default class Excerpt {
  constructor() {}

  public static async up() {
    const db = await getDatabase();

    if (!db) {
      throw new Error("Couldn't get database while running Excerpt.up");
    }

    const getExcerptRecordFunction = () => {
      return `
      DEFINE FUNCTION OVERWRITE fn::get_excerpt_record(
        $excerptId: record<excerpt>
      ) {
        LET $excerpt = SELECT
          *
          OMIT embeddings
          FROM ONLY $excerptId
          FETCH references;
        RETURN $excerpt;
      }
      `;
    };

    const getExcerptsByUserFunction = () => {
      return `
          DEFINE FUNCTION OVERWRITE fn::get_excerpts_by_user(
            $userId: record<user>
          ) {
            LET $excerpts = SELECT
              *,
              ->references->(?) as references
              OMIT embeddings
              FROM excerpt
              WHERE <-owns<-(user WHERE id = $userId);
            RETURN $excerpts;
          }
          `;
    };

    const getExcerptsByExcerptableFunction = () => {
      return `
          DEFINE FUNCTION OVERWRITE fn::get_excerpts_by_excerptable(
            $userId: record<user>,
            $recordId: record
          ) {
            LET $excerpts = SELECT
              *
              OMIT embeddings
              FROM excerpt
              WHERE
                <-owns<-(user WHERE id = $userId) &&
                references = $recordId;
            RETURN $excerpts;
          }
          `;
    };

    await db.query(getExcerptRecordFunction());
    await db.query(getExcerptsByUserFunction());
    await db.query(getExcerptsByExcerptableFunction());
  }

  public static async from(source: IExcerptable, form: IExcerptForm) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get database");
      }
      console.log("Creating with form: ", form);
      const created = await db.create<IExcerpt, IExcerptCreator>("excerpt", {
        ...form,
        references: new StringRecordId(source.id),
        embeddings: await getEmbedder().getEmptyEmbeddings(),
        pdfMetadata: form.pdfMetadata,
        embeddingsUpdatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      if (!created) {
        throw new Error("Couldn't create excerpt");
      }
      const [excerpt] = created;
      if (!excerpt) {
        throw new Error("No excerpt found.");
      }
      await this.establishOwnership(source.owner, excerpt.id);
      await this.excerptForUser(source.owner, excerpt.id);
      this.loadEmbeddings(excerpt.id);
      return excerpt;
    } catch (error) {
      console.error("Error creating excerpt: ", source, form, error);
      return undefined;
    }
  }

  public static async get(excerptId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get database");
      }
      const excerpt = await db.run<IExcerpt>("fn::get_excerpt_record", [
        new StringRecordId(excerptId),
      ]);
      if (!excerpt) {
        throw new Error("Couldn't get excerpt");
      }
      return excerpt;
    } catch (error) {
      console.error("Error getting excerpt: ", excerptId, error);
      return undefined;
    }
  }

  public static async all(userId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get database");
      }
      const excerpts = await db.run<IExcerpt[]>("fn::get_excerpts_by_user", [
        new StringRecordId(userId),
      ]);
      return excerpts;
    } catch (error) {
      console.error("Error getting excerpts: ", error);
      return undefined;
    }
  }

  public static async allExcerptable(
    userId: string | RecordId,
    excerptableId: string | RecordId,
  ) {
    try {
      const db = await getDatabase();
      if (!db) {
        return undefined;
      }
      const excerpts = await db.run<IExcerptable[]>(
        `fn::get_excerpts_by_excerptable`,
        [new StringRecordId(userId), new StringRecordId(excerptableId)],
      );

      if (!excerpts) {
        throw new Error("No excerpts returned");
      }

      return excerpts;
    } catch (error) {
      console.error("Something went wrong getting from excerptable: ", error);
      return undefined;
    }
  }

  public static async update(
    excerptId: string | RecordId,
    updates: Partial<IExcerptCreator>,
  ) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get database");
      }
      const updater: Partial<IExcerptCreator> = {
        updatedAt: new Date(),
      };
      if (updates.note) {
        updater.note = updates.note;
      }
      if (updates.sourceText) {
        updater.sourceText = updates.sourceText;
      }
      if (updates.embeddings) {
        updater.embeddings = updates.embeddings;
        updater.embeddingsUpdatedAt = new Date();
      }
      const update = await db.merge<IExcerpt, Partial<IExcerptCreator>>(
        new StringRecordId(excerptId),
        {
          ...updater,
        },
      );
      if (!update) {
        throw new Error("Couldn't update excerpt");
      }
      this.loadEmbeddings(excerptId);
      return update;
    } catch (error) {
      console.error("Error updating excerpt: ", excerptId, updates, error);
      return undefined;
    }
  }

  public static async delete(excerptId: string | RecordId) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get database");
      }
      const deleted = await db.delete<IExcerpt>(new StringRecordId(excerptId));
      if (!deleted) {
        throw new Error("Couldn't delete excerpt");
      }
      return deleted;
    } catch (error) {
      console.error("Error deleting excerpt: ", excerptId, error);
      return undefined;
    }
  }

  public static async establishOwnership(
    userId: string | RecordId,
    excerptId: string | RecordId,
  ) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get database");
      }
      const result = await db.query<[IExcerptOwnership]>(
        `RELATE $userId->owns->$excerptId CONTENT { createdAt: $now };`,
        {
          userId: new StringRecordId(userId),
          excerptId: new StringRecordId(excerptId),
          now: new Date(),
        },
      );
      if (!result) {
        throw new Error("Couldn't get results");
      }
      const [relationship] = result;
      if (!relationship) {
        throw new Error("Couldn't create user->owns->excerpt relationship");
      }
      return relationship;
    } catch (error) {
      console.error("Error creating user->owns->excerpt relationship: ", error);
      return undefined;
    }
  }

  public static async excerptForUser(
    userId: string | RecordId,
    excerptId: string | RecordId,
  ) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Couldn't get database");
      }
      const result = await db.query<[IExcerptForUser]>(
        `RELATE $userId->excerpts->$excerptId CONTENT { createdAt: $now };`,
        {
          userId: new StringRecordId(userId),
          excerptId: new StringRecordId(excerptId),
          now: new Date(),
        },
      );
      if (!result) {
        throw new Error("Couldn't get results");
      }
      const [relationship] = result;
      if (!relationship) {
        throw new Error("Couldn't create user->excerpts->excerpt relationship");
      }
      return relationship;
    } catch (error) {
      console.error(
        "Error creating user->excerpts->excerpt relationship: ",
        error,
      );
      return undefined;
    }
  }

  public static async loadEmbeddings(excerptId: string | RecordId) {
    try {
      const excerpt = await this.get(excerptId);
      if (!excerpt) {
        throw new Error("Couldn't load excerpt");
      }
      const embedder = getEmbedder();
      const embeddable = `
        ${excerpt.sourceText}
        ---
        ${excerpt.note}
        `;
      const embedding = await embedder.embedContent(embeddable);
      if (!embedding) {
        throw new Error("No embedding generated");
      }
      const updated = await this.update(excerpt.id, {
        embeddings: embedding,
        embeddingsUpdatedAt: new Date(),
      });
      return updated;
    } catch (error) {
      console.error("Error loading excerpt embeddings: ", excerptId, error);
      return undefined;
    }
  }
}
