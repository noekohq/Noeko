import { RecordId, StringRecordId } from "surrealdb";
import JSZip from "jszip";
import Task, { ITask } from "../database/models/task";
import { Idea, IIdea, ISafeIdea } from "../database/models/ideas";
import { htmlToMarkdown } from "../utils/formatting";

interface IExportable {
  toMarkdown(): string;
  getFileName(): string;
}

class TaskExport implements IExportable {
  private task: ITask;

  constructor(task: ITask) {
    this.task = task;
  }

  toMarkdown(): string {
    let content = `# ${this.task.description}\n\n`;
    if (this.task.scratchpad) {
      content += `## Scratchpad\n\n${htmlToMarkdown(this.task.scratchpad)}\n\n`;
    }
    content += `## Details\n\n`;
    content += `- **Created:** ${this.task.createdAt}\n`;
    content += `- **Updated:** ${this.task.updatedAt}\n`;
    if (this.task.dueDate) {
      content += `- **Due Date:** ${this.task.dueDate}\n`;
    }
    if (this.task.completedAt) {
      content += `- **Completed:** ${this.task.completedAt}\n`;
    }
    if (this.task.estimatedTime) {
      content += `- **Estimated Time:** ${this.task.estimatedTime}\n`;
    }
    return content;
  }

  getFileName(): string {
    // Sanitize title for filename
    const sanitized = this.task.description
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();
    return `tasks/${sanitized}.md`;
  }
}

class IdeaExport implements IExportable {
  private idea: ISafeIdea;

  constructor(idea: ISafeIdea) {
    this.idea = idea;
  }

  toMarkdown(): string {
    let content = `# ${this.idea.title}\n\n`;
    if (this.idea.content) {
      content += `${htmlToMarkdown(this.idea.content)}\n\n`;
    }
    content += `## Details\n\n`;
    content += `- **Created:** ${this.idea.createdAt}\n`;
    content += `- **Updated:** ${this.idea.updatedAt}\n`;
    return content;
  }

  getFileName(): string {
    const sanitized = this.idea.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    return `ideas/${sanitized}.md`;
  }
}

export default class Exporter {
  private userId: StringRecordId;
  private zip: JSZip;

  constructor(userId: string | RecordId) {
    this.userId = new StringRecordId(userId);
    this.zip = new JSZip();
  }

  private async fetchTasks(): Promise<ITask[]> {
    const tasks = await Task.allIncludingCompleted(this.userId.toString());
    return tasks || [];
  }

  private async fetchIdeas(): Promise<ISafeIdea[]> {
    const ideas = await Idea.getAllUserIdeas(this.userId.toString());
    return ideas || [];
  }

  private addFileToZip(item: IExportable) {
    this.zip.file(item.getFileName(), item.toMarkdown());
  }

  public async exportToMarkdownZip(): Promise<Buffer> {
    const tasks = await this.fetchTasks();
    const ideas = await this.fetchIdeas();

    tasks.forEach((task) => {
      this.addFileToZip(new TaskExport(task));
    });

    ideas.forEach((idea) => {
      this.addFileToZip(new IdeaExport(idea));
    });

    return this.zip.generateAsync({ type: "nodebuffer" });
  }
}
