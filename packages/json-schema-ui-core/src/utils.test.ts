import { describe, expect, it } from 'vitest';
import { generateDefaultUiSchema, getUiField } from './utils';

describe('generateDefaultUiSchema', () => {
  it('picks widget by primitive type', () => {
    expect(generateDefaultUiSchema({ type: 'string' })).toEqual({ 'ui:widget': 'text' });
    expect(generateDefaultUiSchema({ type: 'number' })).toEqual({ 'ui:widget': 'updown' });
    expect(generateDefaultUiSchema({ type: 'integer' })).toEqual({ 'ui:widget': 'updown' });
    expect(generateDefaultUiSchema({ type: 'boolean' })).toEqual({ 'ui:widget': 'checkbox' });
  });

  it('picks select for enum', () => {
    expect(generateDefaultUiSchema({ type: 'string', enum: ['a', 'b'] })).toEqual({
      'ui:widget': 'select',
    });
  });

  it('nests object properties with ui:order', () => {
    const ui = generateDefaultUiSchema({
      type: 'object',
      properties: { name: { type: 'string' }, age: { type: 'integer' } },
    });
    expect(ui['ui:order']).toEqual(['name', 'age']);
    expect(ui.name).toEqual({ 'ui:widget': 'text' });
    expect(ui.age).toEqual({ 'ui:widget': 'updown' });
  });

  it('nests array items', () => {
    const ui = generateDefaultUiSchema({ type: 'array', items: { type: 'string' } });
    expect(ui.items).toEqual({ 'ui:widget': 'text' });
  });
});

describe('getUiField', () => {
  const ui = generateDefaultUiSchema({
    type: 'object',
    properties: {
      name: { type: 'string' },
      prefs: { type: 'object', properties: { theme: { type: 'string' } } },
    },
  });

  it('returns nested node by path', () => {
    expect(getUiField(ui, ['name'])).toEqual({ 'ui:widget': 'text' });
    expect(getUiField(ui, ['prefs', 'theme'])).toEqual({ 'ui:widget': 'text' });
  });

  it('returns undefined for missing path', () => {
    expect(getUiField(ui, ['missing'])).toBeUndefined();
    expect(getUiField(undefined, ['name'])).toBeUndefined();
  });
});