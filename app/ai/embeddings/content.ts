import type { IExcerpt } from "../../../shared/types/excerpt";
import type { ISource } from "../../../shared/types/source";
import type { ITag } from "../../../shared/types/tags";
import type { ITask } from "../../../shared/types/task";
import { htmlToMarkdown } from "../../utils/formatting";

export const getTagEmbeddableContent = (tag: Pick<ITag, "name" | "description">) => {
  return `${tag.name}:${tag.description}`;
};

export const getTaskEmbeddableContent = (task: Pick<ITask, "description" | "scratchpad">) => {
  return `${task.description}\n---\n${htmlToMarkdown(task.scratchpad ?? "")}`;
};

export const getSourceEmbeddableContent = (source: Pick<ISource, "analysis">): string | null => {
  if (!source.analysis) {
    return null;
  }
  return `${source.analysis.headline}\n---\n${source.analysis.abstract}`;
};

export const getExcerptEmbeddableContent = (excerpt: Pick<IExcerpt, "sourceText" | "note">) => {
  return `${excerpt.sourceText}\n---\n${excerpt.note}`;
};
