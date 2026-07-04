import { describe, expect, it } from 'vitest';
import { generateSampleData } from './utils';

describe('generateSampleData', () => {
  it('returns default values for primitives', () => {
    expect(generateSampleData({ type: 'string' })).toBe('string');
    expect(generateSampleData({ type: 'number' })).toBe(0);
    expect(generateSampleData({ type: 'integer' })).toBe(0);
    expect(generateSampleData({ type: 'boolean' })).toBe(true);
  });

  it('generates an object from properties', () => {
    expect(
      generateSampleData({
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' },
        },
      })
    ).toEqual({ name: 'string', age: 0 });
  });

  it('generates an array from items', () => {
    expect(
      generateSampleData({
        type: 'array',
        items: { type: 'string' },
      })
    ).toEqual(['string']);
  });

  it('returns null for unknown types', () => {
    expect(generateSampleData({})).toBeNull();
  });

  it('returns empty object for object without properties', () => {
    expect(generateSampleData({ type: 'object' })).toEqual({});
  });

  it('returns empty array for array without items', () => {
    expect(generateSampleData({ type: 'array' })).toEqual([]);
  });
});
