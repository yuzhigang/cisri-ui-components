import type { JsonSchema } from '@cisri/json-schema-core';

export function validateForm(schema: JsonSchema, value: unknown): string[] {
  const errors: string[] = [];
  if (schema.type === 'object' && schema.properties) {
    const required = new Set(schema.required ?? []);
    const obj = (value ?? {}) as Record<string, unknown>;
    for (const name of Object.keys(schema.properties)) {
      if (required.has(name) && (obj[name] == null || obj[name] === '')) {
        errors.push(`${name} is required`);
      }
    }
  }
  return errors;
}