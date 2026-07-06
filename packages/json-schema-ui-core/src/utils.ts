import type { JsonSchema } from '@cisri/json-schema-core';
import type { UiSchema, UiWidget } from './types';

function defaultWidgetForSchema(schema: JsonSchema): UiWidget {
  if (schema.enum) return 'select';
  switch (schema.type) {
    case 'number':
    case 'integer':
      return 'updown';
    case 'boolean':
      return 'checkbox';
    case 'string':
    default:
      return 'text';
  }
}

export function generateDefaultUiSchema(schema: JsonSchema): UiSchema {
  const ui: UiSchema = {};
  if (schema.type === 'object' && schema.properties) {
    const order = Object.keys(schema.properties);
    if (order.length > 0) ui['ui:order'] = order;
    for (const [name, child] of Object.entries(schema.properties)) {
      ui[name] = generateDefaultUiSchema(child);
    }
  } else if (schema.type === 'array' && schema.items) {
    ui.items = generateDefaultUiSchema(schema.items);
  } else {
    ui['ui:widget'] = defaultWidgetForSchema(schema);
  }
  return ui;
}

export function getUiField(
  uiSchema: UiSchema | undefined,
  path: string[]
): UiSchema | undefined {
  let node: UiSchema | undefined = uiSchema;
  for (const segment of path) {
    if (node == null || typeof node !== 'object') return undefined;
    node = node[segment] as UiSchema | undefined;
  }
  return node;
}

export function setUiField(
  uiSchema: UiSchema,
  path: string[],
  patch: Partial<UiSchema>
): UiSchema {
  if (path.length === 0) return { ...uiSchema, ...patch };
  const [head, ...rest] = path;
  const child = (uiSchema[head] as UiSchema | undefined) ?? {};
  return { ...uiSchema, [head]: setUiField(child, rest, patch) };
}