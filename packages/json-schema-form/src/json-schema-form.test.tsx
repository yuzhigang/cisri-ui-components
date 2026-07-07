import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('JsonSchemaForm boolean + enum', () => {
  it('renders a checkbox for boolean and toggles true/false', () => {
    const onChange = vi.fn();
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { active: { type: 'boolean' } } }}
        value={{ active: false }}
        onChange={onChange}
      />
    );
    const cb = screen.getByRole('checkbox', { name: 'active' });
    fireEvent.click(cb);
    expect(onChange.mock.calls.at(-1)?.[0]).toEqual({ active: true });
  });

  it('renders a select for enum and changes value', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { color: { type: 'string', enum: ['red', 'green', 'blue'] } } }}
        value={{ color: 'red' }}
        onChange={onChange}
      />
    );
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'green' }));
    expect(onChange.mock.calls.at(-1)?.[0]).toEqual({ color: 'green' });
  });

  it('renders radio buttons for a boolean with ui:widget radio', () => {
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { active: { type: 'boolean' } } }}
        uiSchema={{ active: { 'ui:widget': 'radio' } }}
        value={{ active: false }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByRole('radio', { name: /true/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /false/i })).toBeInTheDocument();
  });
});