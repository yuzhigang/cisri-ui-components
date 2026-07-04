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

export interface SchemaField {
  id: string;
  name: string;
  type: JsonSchemaType;
  required: boolean;
  description?: string;
  schema: JsonSchema;
  children: SchemaField[];
  expanded: boolean;
  isArrayItem?: boolean;
  isRoot?: boolean;
}

let globalIdCounter = 0;

export function generateId(): string {
  return `sf-${++globalIdCounter}`;
}

export function resetIdCounter(): void {
  globalIdCounter = 0;
}

export function defaultChildrenForType(type: JsonSchemaType): SchemaField[] {
  if (type === 'object') {
    return [buildField('field1', { type: 'string' }, new Set())];
  }
  if (type === 'array') {
    return [buildField('ITEMS', { type: 'string' }, new Set(), true)];
  }
  return [];
}

export function buildField(
  name: string,
  schema: JsonSchema,
  requiredSet: Set<string>,
  isArrayItem = false,
  isRoot = false
): SchemaField {
  const type = schema.type ?? 'object';
  const children: SchemaField[] = [];

  if (type === 'object' && schema.properties) {
    const childRequired = new Set(schema.required ?? []);
    for (const [childName, childSchema] of Object.entries(schema.properties)) {
      children.push(buildField(childName, childSchema, childRequired));
    }
  } else if (type === 'array' && schema.items) {
    children.push(buildField('ITEMS', schema.items, new Set(), true));
  }

  return {
    id: generateId(),
    name,
    type,
    required: requiredSet.has(name),
    description: schema.description,
    schema,
    children,
    expanded: true,
    isArrayItem,
    isRoot,
  };
}

export function schemaToFields(schema: JsonSchema): SchemaField[] {
  const root = buildField(schema.title ?? '', schema, new Set(), false, true);
  return [root];
}

export function buildEmptyField(): SchemaField {
  return buildField('', { type: 'string' }, new Set());
}

export function ensureAtLeastOneField(fields: SchemaField[]): SchemaField[] {
  return fields.length > 0 ? fields : [buildEmptyField()];
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

export function fieldsToSchema(fields: SchemaField[]): JsonSchema {
  if (fields.length !== 1 || !fields[0].isRoot) {
    throw new Error('fieldsToSchema expects exactly one root field');
  }
  return fieldToSchema(fields[0]);
}

export function fieldToSchema(field: SchemaField): JsonSchema {
  const base: JsonSchema = { ...field.schema };

  if (field.type === 'object') {
    const childSchema = fieldsToSchemaInner(field.children);
    return {
      ...base,
      type: field.type,
      title: field.isRoot ? field.name : base.title,
      description: field.description,
      properties: childSchema.properties,
      required: childSchema.required,
      items: undefined,
    };
  }

  if (field.type === 'array') {
    const itemField = field.children[0];
    return {
      ...base,
      type: field.type,
      title: field.isRoot ? field.name : base.title,
      description: field.description,
      items: itemField ? fieldToSchema(itemField) : { type: 'string' },
      properties: undefined,
      required: undefined,
    };
  }

  return {
    ...base,
    type: field.type,
    title: field.isRoot ? field.name : base.title,
    description: field.description,
    properties: undefined,
    items: undefined,
    required: undefined,
  };
}

function fieldsToSchemaInner(fields: SchemaField[]): {
  properties: Record<string, JsonSchema>;
  required: string[] | undefined;
} {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];

  for (const field of fields) {
    properties[field.name] = fieldToSchema(field);
    if (field.required) required.push(field.name);
  }

  return {
    properties,
    required: required.length > 0 ? required : undefined,
  };
}
