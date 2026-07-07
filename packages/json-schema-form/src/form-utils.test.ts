import { describe, expect, it } from 'vitest';
import { validateForm } from './form-utils';

describe('validateForm', () => {
  it('reports required object fields that are empty/missing', () => {
    const schema = {
      type: 'object' as const,
      properties: { name: { type: 'string' as const }, age: { type: 'integer' as const } },
      required: ['name'],
    };
    expect(validateForm(schema, {})).toEqual(['name is required']);
    expect(validateForm(schema, { name: '' })).toEqual(['name is required']);
    expect(validateForm(schema, { name: 'x' })).toEqual([]);
  });

  it('returns no errors when there are no required fields', () => {
    expect(validateForm({ type: 'object', properties: { x: { type: 'string' } } }, {})).toEqual([]);
  });

  it('handles non-object schemas (no required check)', () => {
    expect(validateForm({ type: 'string' }, 'x')).toEqual([]);
    expect(validateForm({ type: 'string' }, '')).toEqual([]);
  });
});