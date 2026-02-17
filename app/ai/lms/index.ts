import { Schema, Type } from "@google/genai";
import { PromptBuilder, LMUtils } from "./utils";

export type IModelTypes = "simple" | "advanced" | "fast-accurate" | "general";

export type LMSchema = Schema;
export const LMSchemaType = Type;

export type IModelMap = Record<IModelTypes, string>;

export interface LMProvider {
  model: string;
  utils: LMUtils;
  modelMap: IModelMap;
  generate(prompt: string): Promise<string | null>;
  generateStream(prompt: string): AsyncGenerator<string, void, unknown>;
  generateJSON<T>(prompt: string, schema: LMSchema): Promise<T | null>;
  generateJSONStream(prompt: string, schema: LMSchema): AsyncGenerator<string, void, unknown>;
  withModel(model: string | IModelTypes): LMProvider;
  withThinking(budget?: number): LMProvider;
}
