import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { SuggestionOptions } from "@tiptap/suggestion";
import { IIdea } from "../../../../../app/database/models/ideas";
import { IUserFile } from "../../../../../app/database/models/userfile";
import { RecordId } from "surrealdb";

export interface DreamFileOptions {
  HTMLAttributes: Record<string, any>;
}

export interface IDreamConnectionOptions {
  allowedTypes?: string[];
}

type IDreamConnectionItem =
  | {
      id: RecordId | string;
      type: "idea" | "file";
    }
  | IIdea
  | IUserFile;

async function fetchDreamConnectionItems(
  query: string,
): Promise<IDreamConnectionItem[] | undefined> {
  try {
    return [];
  } catch (error) {
    console.error(error);
    return undefined;
  }
}

export const DreamConnection = Extension.create<IDreamConnectionOptions>({
  name: "dreamConnection",

  addOptions() {
    return {
      allowedTypes: undefined,
    };
  },

  addProseMirrorPlugins() {
    const extension = this;
    const editor = this.editor;

    const suggestionOptions: SuggestionOptions = {
      editor,
      char: "#",
      items: async ({
        query,
      }: {
        query: string;
      }): Promise<IDreamConnectionItem[]> => {
        const items = await fetchDreamConnectionItems(query);
        return items || [];
      },
      command: ({ editor, range, props }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent([
            {
              type: "dreamIdea",
              attrs: {
                id: props.id,
                alias: props.alias,
              },
            },
            {
              type: "text",
              text: " ",
            },
          ])
          .run();
      },
    };
  },
});
