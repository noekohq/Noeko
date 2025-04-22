import { Node, mergeAttributes } from "@tiptap/core";

export interface DreamIdeaOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dreamIdea: {
      setDreamIdea: (options: { id: string }) => ReturnType;
    };
  }
}

export const DreamIdea = Node.create<DreamIdeaOptions>({});
