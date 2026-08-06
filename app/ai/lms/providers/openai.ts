import OpenAI from "openai";
import type { ResponseFormatTextJSONSchemaConfig } from "openai/resources/responses/responses.mjs";
import { IModelMap, IModelTypes, LMProvider, LMSchema, LMSchemaType } from "..";
import { max_lm_prompt_size } from "../../../settings";
import { SchemaConverter } from "../helpers";
import { LMUtils } from "../utils";

const ModelMap: IModelMap = {
  simple: "gpt-5-nano",
  advanced: "gpt-5.6-terra",
  "fast-accurate": "gpt-5-mini",
  general: "gpt-5-mini",
};

export default class OpenAIProvider implements LMProvider {
  private readonly client: OpenAI;
  private readonly _utils: LMUtils;
  private _model = ModelMap.general;
  private reasoningEffort?: "medium";

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required when LM_PROVIDER is openai.");
    }

    this.client = new OpenAI({
      apiKey,
      timeout: 360_000,
    });
    this._utils = new LMUtils(this);
  }

  get utils() {
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

  withThinking(_budget?: number) {
    this.reasoningEffort = "medium";
    return this;
  }

  async generate(prompt: string): Promise<string | null> {
    try {
      const response = await this.client.responses.create({
        model: this.model,
        input: this.truncate(prompt),
        store: false,
        ...this.reasoningConfig(),
      });
      return response.output_text || null;
    } catch (error) {
      console.error("OpenAI text generation failed:", error);
      return null;
    }
  }

  async *generateStream(prompt: string): AsyncGenerator<string, void, unknown> {
    try {
      const stream = await this.client.responses.create({
        model: this.model,
        input: this.truncate(prompt),
        store: false,
        stream: true,
        ...this.reasoningConfig(),
      });

      for await (const event of stream) {
        if (event.type === "response.output_text.delta") {
          yield event.delta;
        }
      }
    } catch (error) {
      console.error("OpenAI text streaming failed:", error);
      throw error;
    }
  }

  async generateJSON<T>(prompt: string, schema: LMSchema): Promise<T | null> {
    try {
      const structuredSchema = this.openAISchema(schema);
      const response = await this.client.responses.create({
        model: this.model,
        input: this.truncate(prompt),
        store: false,
        text: {
          format: this.responseFormat(structuredSchema.schema),
        },
        ...this.reasoningConfig(),
      });

      if (!response.output_text) {
        return null;
      }
      const parsed = JSON.parse(response.output_text) as unknown;
      return structuredSchema.unwrap(parsed) as T;
    } catch (error) {
      console.error("OpenAI structured generation failed:", error);
      return null;
    }
  }

  async *generateJSONStream(
    prompt: string,
    schema: LMSchema
  ): AsyncGenerator<string, void, unknown> {
    try {
      const structuredSchema = this.openAISchema(schema);
      const stream = await this.client.responses.create({
        model: this.model,
        input: this.truncate(prompt),
        store: false,
        stream: true,
        text: {
          format: this.responseFormat(structuredSchema.schema),
        },
        ...this.reasoningConfig(),
      });

      let buffered = "";
      for await (const event of stream) {
        if (event.type === "response.output_text.delta") {
          if (structuredSchema.isWrapped) {
            buffered += event.delta;
          } else {
            yield event.delta;
          }
        }
      }
      if (structuredSchema.isWrapped && buffered) {
        yield JSON.stringify(structuredSchema.unwrap(JSON.parse(buffered)));
      }
    } catch (error) {
      console.error("OpenAI structured streaming failed:", error);
      throw error;
    }
  }

  private truncate(prompt: string) {
    if (prompt.length <= max_lm_prompt_size) {
      return prompt;
    }
    return `${prompt.slice(0, max_lm_prompt_size)}...[FURTHER CONTENT TRUNCATED]...`;
  }

  private responseFormat(schema: LMSchema): ResponseFormatTextJSONSchemaConfig {
    const converted = SchemaConverter.getJSONSchema(schema);
    if (!converted.schema) {
      throw new Error("Unable to convert LM schema to an OpenAI JSON schema.");
    }
    return {
      type: "json_schema",
      name: converted.name.replaceAll(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64),
      description: converted.description,
      schema: converted.schema,
      // Existing LMSchema definitions contain optional properties that are not
      // compatible with OpenAI's strict-schema subset without changing their
      // application-level meaning.
      strict: false,
    };
  }

  /**
   * The Responses API requires the root of a structured-output schema to be an
   * object. The provider interface intentionally supports every LMSchema root,
   * so arrays and primitives are wrapped at the OpenAI boundary and unwrapped
   * before being returned to application code.
   */
  private openAISchema(schema: LMSchema): {
    schema: LMSchema;
    isWrapped: boolean;
    unwrap: (value: unknown) => unknown;
  } {
    if (schema.type === LMSchemaType.OBJECT) {
      return {
        schema,
        isWrapped: false,
        unwrap: (value) => value,
      };
    }

    return {
      schema: {
        type: LMSchemaType.OBJECT,
        title: schema.title,
        description: schema.description,
        properties: {
          value: schema,
        },
        required: ["value"],
      },
      isWrapped: true,
      unwrap: (value) => {
        if (value && typeof value === "object" && "value" in value) {
          return (value as { value: unknown }).value;
        }

        // `strict: false` is required for the existing Lingui-derived schemas.
        // In that mode, Responses occasionally returns the original non-object
        // root (for example, the findings array) instead of the compatibility
        // wrapper requested above. Both forms represent the same application
        // value, so preserve the raw root rather than rejecting a valid result.
        return value;
      },
    };
  }

  private reasoningConfig() {
    if (!this.reasoningEffort || !this.model.startsWith("gpt-5")) {
      return {};
    }
    return {
      reasoning: {
        effort: this.reasoningEffort,
      },
    } as const;
  }
}
