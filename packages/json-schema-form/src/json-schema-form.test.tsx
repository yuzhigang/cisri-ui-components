import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JsonSchemaForm } from './json-schema-form';

describe('JsonSchemaForm primitives', () => {
  it('renders a text input for a string field with label', () => {
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { name: { type: 'string', title: 'Name' } } }}
        value={{ name: '' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('');
  });

  it('calls onChange when a string field is edited', () => {
    const onChange = vi.fn();
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { name: { type: 'string' } } }}
        value={{ name: '' }}
        onChange={onChange}
      />
    );
    fireEvent.change(screen.getByLabelText('name'), { target: { value: 'x' } });
    expect(onChange.mock.calls.at(-1)?.[0]).toEqual({ name: 'x' });
  });

  it('renders a number input for an integer field and converts to number', () => {
    const onChange = vi.fn();
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { age: { type: 'integer' } } }}
        value={{ age: 0 }}
        onChange={onChange}
      />
    );
    const input = screen.getByLabelText('age');
    fireEvent.change(input, { target: { value: '7' } });
    expect(onChange.mock.calls.at(-1)?.[0]).toEqual({ age: 7 });
  });

  it('uses ui:widget textarea + ui:placeholder', () => {
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { bio: { type: 'string' } } }}
        uiSchema={{ bio: { 'ui:widget': 'textarea', 'ui:placeholder': 'Tell your story' } }}
        value={{ bio: '' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByPlaceholderText('Tell your story')).toBeInTheDocument();
  });

  it('uses ui:label to override the label', () => {
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { name: { type: 'string' } } }}
        uiSchema={{ name: { 'ui:label': 'Full Name' } }}
        value={{ name: '' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
  });
});