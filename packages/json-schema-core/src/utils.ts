export type JsonSchemaType =
  | 'object'
  | 'array'
  | 'string'
  | 'number'
  | 'boolean'
  | 'integer';

export interface JsonSchema {
  type?: JsonSchemaType;
  title?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
}

export function generateSampleData(schema: JsonSchema): unknown {
  switch (schema.type) {
    case 'string':
      return 'string';
    case 'number':
    case 'integer':
      return 0;
    case 'boolean':
      return true;
    case 'object': {
      const obj: Record<string, unknown> = {};
      if (schema.properties) {
        for (const [key, child] of Object.entries(schema.properties)) {
          obj[key] = generateSampleData(child);
        }
      }
      return obj;
    }
    case 'array': {
      if (schema.items) {
        return [generateSampleData(schema.items)];
      }
      return [];
    }
    default:
      return null;
  }
}
