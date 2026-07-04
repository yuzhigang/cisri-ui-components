import { describe, expect, it, beforeEach } from 'vitest';
import {
  fieldsToSchema,
  resetIdCounter,
  schemaToFields,
} from './schema-utils';

beforeEach(() => {
  resetIdCounter();
});

describe('schemaToFields', () => {
  it('creates a single root field from an object schema', () => {
    const fields = schemaToFields({
      type: 'object',
      title: 'User',
      description: 'A user schema',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
    });

    expect(fields).toHaveLength(1);
    const [root] = fields;
    expect(root.isRoot).toBe(true);
    expect(root.name).toBe('User');
    expect(root.type).toBe('object');
    expect(root.description).toBe('A user schema');
    expect(root.required).toBe(false);
    expect(root.children).toHaveLength(1);
    expect(root.children[0].name).toBe('name');
  });

  it('creates root for a primitive schema', () => {
    const fields = schemaToFields({ type: 'string' });
    expect(fields).toHaveLength(1);
    expect(fields[0].isRoot).toBe(true);
    expect(fields[0].type).toBe('string');
    expect(fields[0].children).toHaveLength(0);
  });

  it('defaults empty schema to object root', () => {
    const fields = schemaToFields({});
    expect(fields[0].type).toBe('object');
    expect(fields[0].isRoot).toBe(true);
  });
});

describe('fieldsToSchema', () => {
  it('roundtrips an object schema through root', () => {
    const input = {
      type: 'object' as const,
      title: 'User',
      description: 'A user',
      properties: {
        name: { type: 'string' as const },
      },
      required: ['name'],
    };
    const schema = fieldsToSchema(schemaToFields(input));
    expect(schema).toEqual(input);
  });

  it('roundtrips an array of strings schema', () => {
    const input = {
      type: 'array' as const,
      title: 'Tags',
      items: { type: 'string' as const },
    };
    const schema = fieldsToSchema(schemaToFields(input));
    expect(schema).toEqual(input);
  });

  it('roundtrips a primitive string schema', () => {
    const input = {
      type: 'string' as const,
      title: 'Token',
      description: 'A token',
    };
    const schema = fieldsToSchema(schemaToFields(input));
    expect(schema).toEqual(input);
  });

  it('throws when there is no root field', () => {
    expect(() => fieldsToSchema([])).toThrow('expects exactly one root field');
  });
});
