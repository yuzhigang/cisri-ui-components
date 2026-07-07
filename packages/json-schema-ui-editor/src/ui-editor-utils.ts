import type { JsonSchema } from '@cisri/json-schema-core';
import type { UiWidget } from '@cisri/json-schema-ui-core';

export function isPrimitiveField(schema: JsonSchema): boolean {
  if (schema.enum) return true;
  return (
    schema.type === 'string' ||
    schema.type === 'number' ||
    schema.type === 'integer' ||
    schema.type === 'boolean'
  );
}

export function widgetsForSchema(schema: JsonSchema): UiWidget[] {
  if (schema.enum) return ['select', 'radio', 'hidden'];
  switch (schema.type) {
    case 'string':
      return ['text', 'textarea', 'password', 'color', 'date', 'hidden'];
    case 'number':
    case 'integer':
      return ['updown', 'range', 'hidden'];
    case 'boolean':
      return ['checkbox', 'radio', 'hidden'];
    default:
      return [];
  }
}

export function reorderOrder(order: string[], activeId: string, overId: string): string[] {
  const from = order.indexOf(activeId);
  const to = order.indexOf(overId);
  if (from === -1 || to === -1 || from === to) return order;
  const next = [...order];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}