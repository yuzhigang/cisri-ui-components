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

describe('JsonSchemaForm object', () => {
  it('renders nested object properties and updates by path', () => {
    const onChange = vi.fn();
    render(
      <JsonSchemaForm
        schema={{
          type: 'object',
          properties: {
            name: { type: 'string' },
            prefs: { type: 'object', properties: { theme: { type: 'string' } } },
          },
        }}
        value={{ name: '', prefs: { theme: '' } }}
        onChange={onChange}
      />
    );
    fireEvent.change(screen.getByLabelText('theme'), { target: { value: 'dark' } });
    expect(onChange.mock.calls.at(-1)?.[0]).toEqual({ name: '', prefs: { theme: 'dark' } });
  });

  it('respects ui:order for property rendering order', () => {
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { a: { type: 'string' }, b: { type: 'string' } } }}
        uiSchema={{ 'ui:order': ['b', 'a'] }}
        value={{ a: '', b: '' }}
        onChange={vi.fn()}
      />
    );
    const labels = screen.getAllByRole('textbox').map((el) => el.getAttribute('id'));
    expect(labels[0]).toContain('b');
    expect(labels[1]).toContain('a');
  });
});

describe('JsonSchemaForm array', () => {
  it('renders array items and appends a new item', () => {
    const onChange = vi.fn();
    render(
      <JsonSchemaForm
        schema={{ type: 'array', items: { type: 'string' } }}
        value={['a']}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: '添加一项' }));
    expect(onChange.mock.calls.at(-1)?.[0]).toEqual(['a', undefined]);
  });

  it('removes an item via the × button', () => {
    const onChange = vi.fn();
    render(
      <JsonSchemaForm
        schema={{ type: 'array', items: { type: 'string' } }}
        value={['a', 'b']}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: '删除第 1 项' }));
    expect(onChange.mock.calls.at(-1)?.[0]).toEqual(['b']);
  });
});

describe('JsonSchemaForm ui hints', () => {
  it('hides a field with ui:hidden', () => {
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { name: { type: 'string' }, secret: { type: 'string' } } }}
        uiSchema={{ secret: { 'ui:hidden': true } }}
        value={{ name: '', secret: '' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByLabelText('name')).toBeInTheDocument();
    expect(screen.queryByLabelText('secret')).not.toBeInTheDocument();
  });

  it('renders ui:help text under the field', () => {
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { name: { type: 'string' } } }}
        uiSchema={{ name: { 'ui:help': 'Your full name' } }}
        value={{ name: '' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText('Your full name')).toBeInTheDocument();
  });

  it('disables a field with ui:disabled', () => {
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { name: { type: 'string' } } }}
        uiSchema={{ name: { 'ui:disabled': true } }}
        value={{ name: '' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByLabelText('name')).toBeDisabled();
  });

  it('hides label when ui:label is false', () => {
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { name: { type: 'string' } } }}
        uiSchema={{ name: { 'ui:label': false } }}
        value={{ name: '' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.queryByLabelText('name')).not.toBeInTheDocument();
  });
});

describe('JsonSchemaForm renderFieldActions', () => {
  it('renders the action node beside each field with its path', () => {
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { name: { type: 'string' }, age: { type: 'integer' } } }}
        value={{ name: '', age: 0 }}
        onChange={vi.fn()}
        renderFieldActions={({ path }) => <button type="button" data-testid={`cfg-${path.join('.')}`}>cfg</button>}
      />
    );
    expect(screen.getByTestId('cfg-name')).toBeInTheDocument();
    expect(screen.getByTestId('cfg-age')).toBeInTheDocument();
  });
});

describe('JsonSchemaForm validation', () => {
  it('calls onError with required-field errors', () => {
    const onError = vi.fn();
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { name: { type: 'string' } }, required: ['name'] }}
        value={{}}
        onChange={vi.fn()}
        onError={onError}
      />
    );
    expect(onError.mock.calls.at(-1)?.[0]).toEqual(['name is required']);
  });

  it('calls onError with empty array when valid', () => {
    const onError = vi.fn();
    render(
      <JsonSchemaForm
        schema={{ type: 'object', properties: { name: { type: 'string' } }, required: ['name'] }}
        value={{ name: 'x' }}
        onChange={vi.fn()}
        onError={onError}
      />
    );
    expect(onError.mock.calls.at(-1)?.[0]).toEqual([]);
  });
});