import { RecordId, StringRecordId } from "surrealdb";
import { ISource } from "./source";
import { PdfAnnotationSubtype, Rect } from "@embedpdf/models";
import type { IEmbeddingMetadata } from "./embeddings";

export type IExcerptReference = ISource;

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

export type ITextMetadata = {
  start: number;
  end: number;
  quote: string;
  prefix: string;
  suffix: string;
};

export type IExcerpt = IEmbeddingMetadata & {
  id: string | RecordId;
  sourceText: string;
  note: string;
  embeddings: number[];
  embeddingsUpdatedAt: Date;
  references?: StringRecordId | IExcerptReference;
  pdfMetadata?: IPDFMetadata;
  textMetadata?: ITextMetadata;
  createdAt: Date;
  updatedAt: Date;
  viewedAt: Date;
};

export type IPublicExcerpt = Omit<IExcerpt, "embeddings">;

export type IExcerptCreator = Omit<IExcerpt, "id">;
export type IExcerptForm = Omit<
  IExcerptCreator,
  "embeddings" | "embeddingsUpdatedAt" | "createdAt" | "updatedAt" | "viewedAt" | "references"
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

export type IVirtualExcerptReference = {
  id: string | RecordId;
  in: string | RecordId;
  out: string | RecordId;
  createdAt: Date;
};
