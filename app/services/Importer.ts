import { RecordId } from "surrealdb";
import { markdownToHtml } from "../utils/formatting";
import { Idea } from "../database/models/ideas";

export class Importer {
  constructor() {}

  static async markdownToIdea(
    userId: string | RecordId,
    title: string,
    markdown: string,
  ) {
    try {
      const content = markdownToHtml(markdown);
      const idea = await Idea.create(
        {
          title,
          content,
          embeddings: null,
        },
        userId,
      );
      if (!idea) {
        throw new Error("Error creating idea from Markdown");
      }
    } catch (error) {
      console.error("Error converting markdown to idea: ", error);
      return undefined;
    }
  }
}
