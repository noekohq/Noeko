import { IModelMap, IModelTypes, LMProvider, LMSchema, LMSchemaType } from "..";
import { LMUtils } from "../utils";

const ModelMap: IModelMap = {
  simple: "deterministic",
  advanced: "deterministic",
  "fast-accurate": "deterministic",
  general: "deterministic",
};

type SchemaShape = {
  type?: unknown;
  enum?: unknown[];
  properties?: Record<string, SchemaShape>;
  items?: SchemaShape;
  required?: string[];
};

/**
 * A local provider for deterministic development and browser tests.
 *
 * It implements the same provider boundary as hosted models, so application
 * code continues through the production Spyglass orchestration while external
 * model calls remain repeatable and offline.
 */
export default class DeterministicProvider implements LMProvider {
  private _model = ModelMap.simple;
  private readonly _utils: LMUtils;

  constructor() {
    this._utils = new LMUtils(this);
  }

  get utils(): LMUtils {
    return this._utils;
  }

  get model() {
    return this._model;
  }

  get modelMap() {
    return ModelMap;
  }

  withModel(model: string | IModelTypes) {
    this._model = this.modelMap[model as IModelTypes] ?? model;
    return this;
  }

  withThinking() {
    return this;
  }

  async generate(_prompt: string): Promise<string> {
    return this.overview();
  }

  async *generateStream(_prompt: string): AsyncGenerator<string, void, unknown> {
    for (const chunk of [
      "Your notes identify the Lighthouse learning loop as a practical way ",
      "to improve through deliberate practice and weekly reflection[1].",
    ]) {
      yield chunk;
    }
  }

  async generateJSON<T>(prompt: string, schema: LMSchema): Promise<T> {
    const shape = schema as SchemaShape;
    const properties = shape.properties ?? {};

    if ("intent" in properties && "searches" in properties) {
      const query = this.extract(prompt, /<userQuery>\s*([\s\S]*?)\s*<\/userQuery>/i) ?? "notes";
      const searchQuery = query.match(/\bLighthouse\b/i)?.[0] ?? query;
      return {
        intent: query,
        mode: "briefAnswer",
        searches: [{ query: searchQuery, tables: ["idea"], searchType: { fts: true } }],
      } as T;
    }

    if (
      shape.type === LMSchemaType.ARRAY &&
      shape.items?.properties &&
      "findingType" in shape.items.properties
    ) {
      const sourceId =
        shape.items.properties.sourceId?.enum?.[0]?.toString() ??
        this.extract(prompt, /<id>\s*([\s\S]*?)\s*<\/id>/i) ??
        "idea:deterministic";
      const excerpt =
        this.extract(prompt, /<content>\s*([\s\S]*?)\s*<\/content>/i) ??
        "The Lighthouse learning loop uses deliberate practice and weekly reflection.";

      return [
        {
          sourceId,
          excerpt: excerpt.trim(),
          analysis: "This directly describes the practice-and-reflection loop in the user's notes.",
          findingType: "EXPLANATION",
        },
      ] as T;
    }

    return this.valueForSchema(shape, prompt) as T;
  }

  async *generateJSONStream(
    prompt: string,
    schema: LMSchema
  ): AsyncGenerator<string, void, unknown> {
    const value = await this.generateJSON<unknown>(prompt, schema);
    const json = JSON.stringify(value);
    const midpoint = Math.max(1, Math.floor(json.length / 2));
    yield json.slice(0, midpoint);
    yield json.slice(midpoint);
  }

  private overview() {
    return (
      "Your notes identify the Lighthouse learning loop as a practical way " +
      "to improve through deliberate practice and weekly reflection[1]."
    );
  }

  private extract(prompt: string, pattern: RegExp) {
    return pattern.exec(prompt)?.[1]?.trim();
  }

  private valueForSchema(schema: SchemaShape, prompt: string): unknown {
    if (schema.enum?.length) {
      return schema.enum[0];
    }

    if (schema.type === LMSchemaType.OBJECT) {
      return Object.fromEntries(
        Object.entries(schema.properties ?? {})
          .filter(([key]) => !schema.required || schema.required.includes(key))
          .map(([key, child]) => [
            key,
            key === "text"
              ? this.extract(prompt, /<content>\s*([\s\S]*?)\s*<\/content>/i)?.slice(0, 80) ||
                "Deterministic response"
              : this.valueForSchema(child, prompt),
          ])
      );
    }

    if (schema.type === LMSchemaType.ARRAY) {
      return schema.items ? [this.valueForSchema(schema.items, prompt)] : [];
    }

    if (schema.type === LMSchemaType.BOOLEAN) {
      return true;
    }

    if (schema.type === LMSchemaType.INTEGER || schema.type === LMSchemaType.NUMBER) {
      return 1;
    }

    return "Deterministic response";
  }
}
