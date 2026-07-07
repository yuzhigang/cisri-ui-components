import { describe, expect, it } from 'vitest';
import { isPrimitiveField, widgetsForSchema, reorderOrder } from './ui-editor-utils';

describe('widgetsForSchema', () => {
  it('returns text/textarea/password/color/date/hidden for string', () => {
    expect(widgetsForSchema({ type: 'string' })).toEqual([
      'text', 'textarea', 'password', 'color', 'date', 'hidden',
    ]);
  });
  it('returns updown/range/hidden for integer and number', () => {
    expect(widgetsForSchema({ type: 'integer' })).toEqual(['updown', 'range', 'hidden']);
    expect(widgetsForSchema({ type: 'number' })).toEqual(['updown', 'range', 'hidden']);
  });
  it('returns checkbox/radio/hidden for boolean', () => {
    expect(widgetsForSchema({ type: 'boolean' })).toEqual(['checkbox', 'radio', 'hidden']);
  });
  it('returns select/radio/hidden for an enum field', () => {
    expect(widgetsForSchema({ type: 'string', enum: ['a', 'b'] })).toEqual([
      'select', 'radio', 'hidden',
    ]);
  });
  it('returns [] for object and array', () => {
    expect(widgetsForSchema({ type: 'object', properties: {} })).toEqual([]);
    expect(widgetsForSchema({ type: 'array', items: { type: 'string' } })).toEqual([]);
  });
});

describe('isPrimitiveField', () => {
  it('is true for string/number/integer/boolean and enum', () => {
    expect(isPrimitiveField({ type: 'string' })).toBe(true);
    expect(isPrimitiveField({ type: 'number' })).toBe(true);
    expect(isPrimitiveField({ type: 'integer' })).toBe(true);
    expect(isPrimitiveField({ type: 'boolean' })).toBe(true);
    expect(isPrimitiveField({ type: 'string', enum: ['a'] })).toBe(true);
  });
  it('is false for object and array', () => {
    expect(isPrimitiveField({ type: 'object', properties: {} })).toBe(false);
    expect(isPrimitiveField({ type: 'array', items: { type: 'string' } })).toBe(false);
  });
});

describe('reorderOrder', () => {
  it('moves the active item to the over position', () => {
    expect(reorderOrder(['a', 'b', 'c'], 'a', 'c')).toEqual(['b', 'c', 'a']);
    expect(reorderOrder(['a', 'b', 'c'], 'c', 'a')).toEqual(['c', 'a', 'b']);
  });
  it('returns the same order when active === over', () => {
    expect(reorderOrder(['a', 'b', 'c'], 'a', 'a')).toEqual(['a', 'b', 'c']);
  });
  it('returns the same order when an id is not found', () => {
    expect(reorderOrder(['a', 'b'], 'x', 'a')).toEqual(['a', 'b']);
    expect(reorderOrder(['a', 'b'], 'a', 'x')).toEqual(['a', 'b']);
  });
  it('does not mutate the input array', () => {
    const input = ['a', 'b', 'c'];
    reorderOrder(input, 'a', 'c');
    expect(input).toEqual(['a', 'b', 'c']);
  });
});