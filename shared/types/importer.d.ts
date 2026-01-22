import type { IIdeaForm } from "./idea";

export type IChunk = {
  id: string;
  items: IIdeaForm[];
  totalSize: number;
};
