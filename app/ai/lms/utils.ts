import { LMProvider } from ".";
import { LMSchema, LMSchemaType } from ".";

export class PromptBuilder {
  private _prompt: string = "";

  constructor() {}

  get() {
    return this._prompt;
  }

  addText(text: string) {
    this._prompt += text;
    return this;
  }

  addBlock(title: string, content: string, level = 1) {
    const numPounds = Array(level).fill("#").join("");
    this._prompt += `\n---\n${numPounds} ${title}\n${content}\n`;
    return this;
  }

  addList(title: string, content: string[]) {
    this._prompt += `\n---# ${title}\n${content.map((c) => c).join("\n-")}\n`;
    return this;
  }
}

export class LMUtils {
  lm: LMProvider;

  constructor(lm: LMProvider) {
    this.lm = lm;
  }

  async summarize(
    text: string,
    length: "sentence" | "couple sentences" | "paragraph",
  ): Promise<string | null> {
    try {
      const prompt = new PromptBuilder()
        .addText(`Please summarize the following content into a ${length}`)
        .addText(text)
        .get();
      const result = await this.lm.generateJSON<{ text: string }>(prompt, {
        type: LMSchemaType.OBJECT,
        properties: {
          text: {
            type: LMSchemaType.STRING,
            description: "The summary of the text",
          },
        },
        required: ["text"],
      });
      if (!result) {
        throw Error("Error generating summary");
      }
      if (!result.text) {
        throw Error("Error generating summary");
      }
      return result.text;
    } catch (err) {
      console.error("Error generating summary:", err);
      return null;
    }
  }

  async entitle(content: string, description: string): Promise<string | null> {
    try {
      const prompt = new PromptBuilder()
        .addText(
          `Please write a title for the following content, in accordance with the following title instruction:
          <titleInstructions>
          ${description}
          </titleInstructions>
          `,
        )
        .addText(`<content>`)
        .addText(content)
        .addText(`</content>`)
        .get();
      const result = await this.lm.generateJSON<{ text: string }>(prompt, {
        type: LMSchemaType.OBJECT,
        properties: {
          text: {
            type: LMSchemaType.STRING,
            description: "The entitle of the text",
          },
        },
        required: ["text"],
      });
      if (!result) {
        throw Error("Error generating entitle");
      }
      if (!result.text) {
        throw Error("Error generating entitle");
      }
      return result.text;
    } catch (err) {
      console.error("Error generating entitle:", err);
      return null;
    }
  }
}
