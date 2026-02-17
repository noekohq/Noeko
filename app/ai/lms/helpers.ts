import { ResponseFormatJSONSchema } from "openai/resources/shared.mjs";
import { LMSchema } from ".";

export class SchemaConverter {
  /**
   * Translates a Google Generative AI Schema object to an OpenAI JSONSchema object.
   *
   * @param schema The LMSchema object to convert.
   * @returns The equivalent JSONSchema object.
   */
  public static getJSONSchema(schema: LMSchema): ResponseFormatJSONSchema.JSONSchema {
    // The main differentiator between the two is that the `JSONSchema` object
    // is a wrapper around the actual schema definition, which is contained in
    // the `schema` property. The `LMSchema` is the schema definition itself.
    const jsonSchema: ResponseFormatJSONSchema.JSONSchema = {
      name: schema.title ?? "json_schema",
      description: schema.description,
      schema: this.transformSchema(schema),
    };

    return jsonSchema;
  }

  /**
   * Recursively transforms the LMSchema into a standard JSON Schema object.
   *
   * @param lmSchema The LMSchema object to transform.
   * @returns A plain object representing the JSON Schema.
   */
  private static transformSchema(lmSchema: LMSchema): {
    [key: string]: unknown;
  } {
    const newSchema: { [key: string]: unknown } = {};

    // Direct field mappings
    if (lmSchema.type) newSchema.type = lmSchema.type.toLowerCase();
    if (lmSchema.description) newSchema.description = lmSchema.description;
    if (lmSchema.nullable) newSchema.nullable = lmSchema.nullable;
    if (lmSchema.default) newSchema.default = lmSchema.default;
    if (lmSchema.enum) newSchema.enum = lmSchema.enum;
    if (lmSchema.title) newSchema.title = lmSchema.title;
    if (lmSchema.format) newSchema.format = lmSchema.format;
    if (lmSchema.pattern) newSchema.pattern = lmSchema.pattern;
    if (lmSchema.minimum) newSchema.minimum = lmSchema.minimum;
    if (lmSchema.maximum) newSchema.maximum = lmSchema.maximum;
    if (lmSchema.minLength) newSchema.minLength = parseInt(lmSchema.minLength, 10);
    if (lmSchema.maxLength) newSchema.maxLength = parseInt(lmSchema.maxLength, 10);
    if (lmSchema.minItems) newSchema.minItems = parseInt(lmSchema.minItems, 10);
    if (lmSchema.maxItems) newSchema.maxItems = parseInt(lmSchema.maxItems, 10);
    if (lmSchema.minProperties) newSchema.minProperties = parseInt(lmSchema.minProperties, 10);
    if (lmSchema.maxProperties) newSchema.maxProperties = parseInt(lmSchema.maxProperties, 10);
    if (lmSchema.required) newSchema.required = lmSchema.required;

    // Recursive transformations for nested schemas
    if (lmSchema.items) {
      newSchema.items = this.transformSchema(lmSchema.items);
    }

    if (lmSchema.properties) {
      newSchema.properties = Object.entries(lmSchema.properties).reduce(
        (acc, [key, value]) => {
          acc[key] = this.transformSchema(value);
          return acc;
        },
        {} as { [key: string]: unknown }
      );
    }

    if (lmSchema.anyOf) {
      newSchema.anyOf = lmSchema.anyOf.map((s) => this.transformSchema(s));
    }

    return newSchema;
  }
}
